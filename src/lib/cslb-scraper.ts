/**
 * cslb-scraper.ts
 * ===============
 * Server-side scraper for the California CSLB (Contractors State License
 * Board) public license-lookup form. CSLB has no clean public API, so
 * we drive the ASPX form:
 *
 *   1. GET   https://www.cslb.ca.gov/onlineservices/CheckLicenseII/checkLicense.aspx
 *      → harvest __VIEWSTATE, __VIEWSTATEGENERATOR, __EVENTVALIDATION
 *        (these auto-generate per session and the POST will be rejected
 *        without them) and any Set-Cookie values.
 *   2. POST  same URL with the viewstate + LicNo + Search button name.
 *      → the form 302s to /LicenseDetail.aspx?LicNum=... with all data.
 *
 * The result page uses *stable* element IDs (MainContent_BusInfo,
 * MainContent_ExpDt, MainContent_ClassCellTable, MainContent_BondingCellTable)
 * that have been unchanged for years. We parse with cheerio.
 *
 * If parsing yields nothing usable we return { ok: false, reason }.
 * Callers should fall back to opening the CSLB deep-link in a new tab.
 *
 * Risks / things to watch (see also the route README):
 *   - VIEWSTATE rotation: if CSLB upgrades ASP.NET we may need to grab
 *     a different hidden field set. The scraper logs the field lengths
 *     so a regression shows in `console.warn`.
 *   - ToS: CSLB has no robots.txt and no published rate limit. We cache
 *     aggressively (3 days, enforced by the route) to be polite.
 *   - Layout shift: stable IDs make this resilient, but we still store
 *     raw_html in the cache so we can re-parse without re-hitting CSLB.
 */

import * as cheerio from 'cheerio';

const CSLB_FORM_URL =
  'https://www.cslb.ca.gov/onlineservices/CheckLicenseII/checkLicense.aspx';

const USER_AGENT =
  'Mozilla/5.0 (compatible; BuilderKnowledgeGarden/1.0; +https://thebuilderknowledgegarden.com)';

export interface CslbLookupResult {
  ok: boolean;
  reason?: string;
  licenseNumber: string;
  /** Business name on file with CSLB. */
  name?: string;
  /** e.g. "B - GENERAL BUILDING" (joined with `, ` if multiple). */
  classification?: string;
  /** "Active", "Suspended", "Expired", or whatever CSLB shows. */
  status?: string;
  /** ISO date (YYYY-MM-DD) parsed from the page's MM/DD/YYYY. */
  expiry?: string;
  bondNumber?: string;
  /** Dollar amount, numeric. $25,000 → 25000. */
  bondAmount?: number;
  /** Returned to callers that want to cache raw HTML for re-parsing. */
  rawHtml?: string;
}

/**
 * Run a single CSLB form lookup.
 *
 * @param licenseNumber digits only (e.g. "1029384")
 * @param opts.includeRawHtml include the result HTML on the response
 *                            (used by the API route for cache writes).
 */
export async function lookupCslbLicense(
  licenseNumber: string,
  opts: { includeRawHtml?: boolean } = {}
): Promise<CslbLookupResult> {
  const cleaned = String(licenseNumber || '').replace(/\D/g, '');
  if (!cleaned) {
    return { ok: false, reason: 'License number is required', licenseNumber: '' };
  }

  // ── Step 1: GET form page (also collects Set-Cookie for the session) ──
  const formResp = await fetch(CSLB_FORM_URL, {
    method: 'GET',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  });
  if (!formResp.ok) {
    return {
      ok: false,
      reason: `CSLB form GET failed: HTTP ${formResp.status}`,
      licenseNumber: cleaned,
    };
  }
  const cookies = collectCookies(formResp.headers);
  const formHtml = await formResp.text();
  const $form = cheerio.load(formHtml);
  const viewState = $form('input[name="__VIEWSTATE"]').attr('value') || '';
  const viewStateGen = $form('input[name="__VIEWSTATEGENERATOR"]').attr('value') || '';
  const eventValidation = $form('input[name="__EVENTVALIDATION"]').attr('value') || '';

  if (!viewState || !eventValidation) {
    console.warn('[cslb-scraper] missing viewstate fields', {
      vsLen: viewState.length,
      evLen: eventValidation.length,
    });
    return {
      ok: false,
      reason: 'CSLB form layout changed — viewstate missing',
      licenseNumber: cleaned,
    };
  }

  // ── Step 2: POST the lookup. We use URLSearchParams so commas/$ in
  // the field names are correctly encoded; the form uses ASP.NET-style
  // `ctl00$MainContent$...` keys.
  const body = new URLSearchParams();
  body.set('__VIEWSTATE', viewState);
  body.set('__VIEWSTATEGENERATOR', viewStateGen);
  body.set('__EVENTVALIDATION', eventValidation);
  body.set('ctl00$MainContent$LicNo', cleaned);
  body.set('ctl00$MainContent$Contractor_License_Number_Search', 'Search');

  const detailResp = await fetch(CSLB_FORM_URL, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: CSLB_FORM_URL,
      Cookie: cookies,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    body: body.toString(),
    redirect: 'follow',
  });
  if (!detailResp.ok) {
    return {
      ok: false,
      reason: `CSLB form POST failed: HTTP ${detailResp.status}`,
      licenseNumber: cleaned,
    };
  }
  const detailHtml = await detailResp.text();

  // ── Step 3: parse the detail page ──
  const parsed = parseCslbDetailHtml(detailHtml, cleaned);
  if (opts.includeRawHtml) parsed.rawHtml = detailHtml;
  return parsed;
}

/**
 * Parse a CSLB LicenseDetail.aspx HTML page.
 *
 * Exported so we can unit-test against fixtures without hitting CSLB.
 */
export function parseCslbDetailHtml(
  html: string,
  licenseNumber: string
): CslbLookupResult {
  const $ = cheerio.load(html);

  // Did the lookup succeed? The detail page sets MainContent_BusInfo.
  // The cell contains:  NAME<br />STREET<br />CITY,STATE ZIP<br />Phone...
  // — we want only the first line (the business name).
  const busInfoCell = $('#MainContent_BusInfo');
  if (!busInfoCell.length) {
    return {
      ok: false,
      reason: 'No matching license found',
      licenseNumber,
    };
  }
  const busInfoHtml = busInfoCell.html() || '';
  const firstSegment = busInfoHtml.split(/<br\s*\/?>/i)[0] || '';
  const name = cheerio.load(`<root>${firstSegment}</root>`)('root').text().trim();
  if (!name) {
    return {
      ok: false,
      reason: 'No matching license found',
      licenseNumber,
    };
  }

  const expiryRaw = textOrNull($, '#MainContent_ExpDt');
  const expiry = parseUsDate(expiryRaw);

  // Status: the text-success / text-danger class on ExpDt or the
  // status row body is the canonical signal. We pull the License Status
  // section: it lives after a "License Status" h2.
  const status = extractStatus($);

  // Classifications: anchor(s) inside #MainContent_ClassCellTable.
  const classification = extractClassifications($);

  // Bond block: inside #MainContent_BondingCellTable. Body looks like
  //   <strong>Bond Number: </strong>100742793
  //   <strong>Bond Amount: </strong>$25,000
  const { bondNumber, bondAmount } = extractBond($);

  return {
    ok: true,
    licenseNumber,
    name: name.trim(),
    classification: classification || undefined,
    status: status || undefined,
    expiry: expiry || undefined,
    bondNumber: bondNumber || undefined,
    bondAmount: bondAmount ?? undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function collectCookies(headers: Headers): string {
  // fetch in Node returns Set-Cookie as a single string with comma
  // separators between cookies — but ALSO commas inside Expires dates.
  // For our purposes the CSLB session cookie is the only one we need
  // back, and the server is tolerant of all of them being sent.
  const raw = headers.get('set-cookie') || '';
  if (!raw) return '';
  // Strip Expires= sub-fields (they contain commas that confuse a split).
  const stripped = raw.replace(/Expires=[^,;]+,?/gi, '');
  const parts = stripped.split(/,(?=[^=]+=)/);
  return parts
    .map((c) => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

function textOrNull(
  $: cheerio.CheerioAPI,
  selector: string
): string | null {
  const el = $(selector);
  if (!el.length) return null;
  const text = el.text().trim();
  return text || null;
}

function parseUsDate(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return undefined;
  const [, mo, da, yr] = m;
  return `${yr}-${mo.padStart(2, '0')}-${da.padStart(2, '0')}`;
}

function extractStatus($: cheerio.CheerioAPI): string | null {
  // The page renders a single-cell <td> after "License Status" h2 with
  // free-form text. We grab the first such td.
  const heading = $('h2.subheading')
    .filter((_, el) => $(el).text().trim().toLowerCase() === 'license status');
  if (!heading.length) return null;
  // Walk forward to the next td that contains text.
  const tr = heading.closest('tr');
  const nextTr = tr.next('tr');
  const text = nextTr.text().replace(/\s+/g, ' ').trim();
  return text || null;
}

function extractClassifications($: cheerio.CheerioAPI): string | null {
  const cell = $('#MainContent_ClassCellTable');
  if (!cell.length) return null;
  const codes: string[] = [];
  cell.find('a').each((_, a) => {
    const t = $(a).text().trim();
    if (t) codes.push(t.replace(/\s+/g, ' '));
  });
  if (codes.length === 0) {
    const fallback = cell.text().trim().replace(/\s+/g, ' ');
    return fallback || null;
  }
  return codes.join(', ');
}

function extractBond($: cheerio.CheerioAPI): {
  bondNumber: string | null;
  bondAmount: number | null;
} {
  const cell = $('#MainContent_BondingCellTable');
  if (!cell.length) return { bondNumber: null, bondAmount: null };

  // We need source HTML to keep <p> boundaries (cheerio .text() flattens
  // sibling tags without inserting whitespace, which lets a value run
  // into the next label, e.g. "100742793Bond Amount").
  const html = cell.html() || '';

  let bondNumber: string | null = null;
  // Bond numbers are usually all digits, occasionally with hyphens.
  // Match digits up to the next non-digit-or-hyphen.
  const numMatch = html.match(/Bond\s*Number:\s*<\/strong>\s*([0-9][0-9-]{2,30})/i)
                ?? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').match(/Bond\s*Number:\s*([0-9][0-9-]{2,30})/i);
  if (numMatch) bondNumber = numMatch[1];

  let bondAmount: number | null = null;
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const amtMatch = plain.match(/Bond\s*Amount:\s*\$([\d,]+(?:\.\d{2})?)/i);
  if (amtMatch) {
    const n = Number(amtMatch[1].replace(/,/g, ''));
    if (!Number.isNaN(n)) bondAmount = n;
  }

  return { bondNumber, bondAmount };
}
