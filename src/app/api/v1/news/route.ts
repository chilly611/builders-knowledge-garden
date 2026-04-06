import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

type Lane = 'dreamer' | 'builder' | 'specialist' | 'merchant' | 'ally' | 'crew' | 'fleet' | 'machine';
type Category = 'All' | 'Regulations' | 'Materials & Products' | 'Safety' | 'Market Trends' | 'Technology';
type ImpactLevel = 'High' | 'Medium' | 'Low';

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  category: Category;
  impactLevel: ImpactLevel;
  relevanceTag: string;
  laneInsight: string;
  timestamp: string;
}

interface SavedArticle {
  id: string;
  user_id: string;
  article_id: string;
  article_data: NewsArticle;
  saved_at: string;
}

// Seed articles as fallback data covering major construction news sources
const SEED_ARTICLES: NewsArticle[] = [
  {
    id: 'seed-001',
    title: 'New Infrastructure Bill Allocates $50B for Bridge Repairs',
    summary:
      'The updated infrastructure initiative provides substantial funding for bridge rehabilitation projects across 12 states, expected to impact project scheduling and material sourcing for the next 18 months.',
    source: 'ENR',
    sourceUrl: 'https://www.enr.com',
    category: 'Regulations',
    impactLevel: 'High',
    relevanceTag: 'Relevant to your Builder lane',
    laneInsight: 'Plan for increased demand for inspection teams and staging logistics.',
    timestamp: '2 hours ago',
  },
  {
    id: 'seed-002',
    title: 'Lumber Prices Stabilize After 18-Month Volatility',
    summary:
      'Softwood lumber prices have settled within a 15% range, providing more predictable cost estimates for residential projects. Market analysts expect sustained stability through Q3.',
    source: 'Construction Dive',
    sourceUrl: 'https://www.constructiondive.com',
    category: 'Market Trends',
    impactLevel: 'High',
    relevanceTag: 'Relevant to your Merchant lane',
    laneInsight: 'Lock in material costs now; favorable pricing window for bulk orders.',
    timestamp: '4 hours ago',
  },
  {
    id: 'seed-003',
    title: 'Updated Fall Protection Standards Take Effect July 2026',
    summary:
      'OSHA has finalized revisions to fall protection requirements, including new harness inspection intervals and guardrail height specifications. Training certifications valid before July 1 must be renewed.',
    source: 'OSHA',
    sourceUrl: 'https://www.osha.gov',
    category: 'Safety',
    impactLevel: 'High',
    relevanceTag: 'Relevant to your Crew lane',
    laneInsight: 'Schedule recertification training for all crew members before July 1st.',
    timestamp: '1 day ago',
  },
  {
    id: 'seed-004',
    title: 'Advanced Framing Techniques Reduce Material Waste 15%',
    summary:
      'New optimized framing layouts demonstrated in field trials across 8 project types, cutting material costs while improving structural performance. Techniques compatible with standard tools.',
    source: 'JLC',
    sourceUrl: 'https://www.jlconline.com',
    category: 'Materials & Products',
    impactLevel: 'Medium',
    relevanceTag: 'Relevant to your Specialist lane',
    laneInsight: 'Consider implementing for commercial projects; ROI measured in labor hours saved.',
    timestamp: '2 days ago',
  },
  {
    id: 'seed-005',
    title: 'Steel Delivery Times Normalized to 6-Week Standard',
    summary:
      'Major suppliers report consistent 6-week lead times for structural steel, down from 12+ weeks in previous quarters. Pre-order windows remain recommended for critical path items.',
    source: 'Steel Market',
    sourceUrl: 'https://www.steelmarketupdate.com',
    category: 'Materials & Products',
    impactLevel: 'Medium',
    relevanceTag: 'Relevant to your Builder lane',
    laneInsight: 'Improved scheduling predictability; adjust procurement timelines accordingly.',
    timestamp: '3 days ago',
  },
  {
    id: 'seed-006',
    title: 'Real Estate Tech Platform Launches Automated Permit Filing',
    summary:
      'New SaaS platform automates municipal permit applications across 47 jurisdictions, reducing processing time from 3-4 weeks to 5-7 business days. Integration with BIM software available.',
    source: 'Tech in Construction',
    sourceUrl: 'https://www.techinconstructionmag.com',
    category: 'Technology',
    impactLevel: 'Medium',
    relevanceTag: 'Relevant to your Machine lane',
    laneInsight: 'API-driven workflow; evaluate for data standardization benefits.',
    timestamp: '4 days ago',
  },
  {
    id: 'seed-007',
    title: 'Concrete Admixture Innovation Accelerates Curing by 20%',
    summary:
      'New non-toxic admixture accelerates concrete curing without compromising long-term strength. Tested across residential, commercial, and industrial applications. Cost premium 5-8%.',
    source: 'Construction Dive',
    sourceUrl: 'https://www.constructiondive.com',
    category: 'Materials & Products',
    impactLevel: 'Medium',
    relevanceTag: 'Relevant to your Dreamer lane',
    laneInsight: 'Enables faster design iterations; faster feedback cycles on material performance.',
    timestamp: '5 days ago',
  },
  {
    id: 'seed-008',
    title: 'NAHB Report: Labor Productivity Down 3% YoY',
    summary:
      'Latest National Association of Home Builders data shows slight productivity decline attributed to workforce learning curve on new safety protocols and tool requirements.',
    source: 'NAHB',
    sourceUrl: 'https://www.nahb.org',
    category: 'Market Trends',
    impactLevel: 'Medium',
    relevanceTag: 'Relevant to your Crew lane',
    laneInsight: 'Budget additional time for training phases; safety protocols now standard.',
    timestamp: '1 week ago',
  },
  {
    id: 'seed-009',
    title: 'Window Replacement Market Shifts Toward Energy-Efficient Models',
    summary:
      'Energy-efficient windows now comprise 62% of residential replacements, driven by stricter building codes and homeowner demand. Traditional models declining steadily.',
    source: 'ENR',
    sourceUrl: 'https://www.enr.com',
    category: 'Materials & Products',
    impactLevel: 'Medium',
    relevanceTag: 'Relevant to your Dreamer lane',
    laneInsight: 'Design with efficiency as primary feature; supports sustainability goals.',
    timestamp: '1 week ago',
  },
  {
    id: 'seed-010',
    title: 'Electrical Code Update: EV Charging Infrastructure Requirements',
    summary:
      'New electrical code addendum mandates EV charging conduit installation in all new commercial construction. Retrofit provisions available for existing projects.',
    source: 'Electrical Contractor',
    sourceUrl: 'https://www.ecmag.com',
    category: 'Regulations',
    impactLevel: 'High',
    relevanceTag: 'Relevant to your Specialist lane',
    laneInsight: 'Update bid templates; increased material and labor costs for electrical phase.',
    timestamp: '1 week ago',
  },
  {
    id: 'seed-011',
    title: 'Construction Equipment Rental Market Growth at 8% Annually',
    summary:
      'Rental market outpacing equipment sales due to flexible lease terms and reduced capital requirements. Specialty equipment availability up 25% across regions.',
    source: 'Equipment Today',
    sourceUrl: 'https://www.equipmenttoday.com',
    category: 'Market Trends',
    impactLevel: 'Low',
    relevanceTag: 'Relevant to your Fleet lane',
    laneInsight: 'Evaluate rental vs. purchase economics; specialty items now accessible.',
    timestamp: '2 weeks ago',
  },
  {
    id: 'seed-012',
    title: 'API Standards for Building Data Exchange Released',
    summary:
      'Industry consortium releases standardized APIs for exchanging scheduling, cost, and material data between project management platforms. Adoption expected to increase over 2026.',
    source: 'Digital Construction',
    sourceUrl: 'https://www.digitalconstruction.org',
    category: 'Technology',
    impactLevel: 'Medium',
    relevanceTag: 'Relevant to your Machine lane',
    laneInsight: 'Enables system interoperability; plan for integration roadmap.',
    timestamp: '2 weeks ago',
  },
  {
    id: 'seed-013',
    title: 'Supply Chain Transparency Initiative Gains Industry Support',
    summary:
      'New blockchain-based supply chain tracking system gains backing from 12 major material suppliers. Reduces counterfeit parts and improves warranty claims.',
    source: 'Supply Chain Quarterly',
    sourceUrl: 'https://www.supplychainquarterly.com',
    category: 'Technology',
    impactLevel: 'Medium',
    relevanceTag: 'Relevant to your Merchant lane',
    laneInsight: 'Improved quality assurance; supplier relationships strengthened through transparency.',
    timestamp: '3 weeks ago',
  },
  {
    id: 'seed-014',
    title: 'Skilled Trades Apprenticeship Program Expands to 15 States',
    summary:
      'Federal funding supports apprenticeship programs with focus on electricians, plumbers, and carpenters. Wage support available for employers; first cohorts starting Q2 2026.',
    source: 'Workforce Development',
    sourceUrl: 'https://www.workforcedevelop.gov',
    category: 'Market Trends',
    impactLevel: 'Medium',
    relevanceTag: 'Relevant to your Crew lane',
    laneInsight: 'Expand training program; apprentices available at reduced initial cost.',
    timestamp: '3 weeks ago',
  },
  {
    id: 'seed-015',
    title: 'Prefabrication Adoption Increases to 18% of New Commercial Projects',
    summary:
      'Modular construction methods now used in 1 of 5.5 commercial projects, up from 1 in 8 last year. Quality control and schedule certainty drive adoption.',
    source: 'Construction Dive',
    sourceUrl: 'https://www.constructiondive.com',
    category: 'Technology',
    impactLevel: 'Medium',
    relevanceTag: 'Relevant to your Builder lane',
    laneInsight: 'Evaluate prefab options for future projects; reduces on-site labor and duration.',
    timestamp: '4 weeks ago',
  },
];

// Cache for articles (4 hour TTL)
let cachedArticles: NewsArticle[] = SEED_ARTICLES;
let cacheTime: number = Date.now();
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

// Lane-specific filtering logic
function filterArticlesByLane(articles: NewsArticle[], lane: Lane): NewsArticle[] {
  const laneFilterMap: Record<Lane, (article: NewsArticle) => boolean> = {
    builder: (a) =>
      ['Regulations', 'Market Trends', 'Safety'].includes(a.category) &&
      ['High', 'Medium'].includes(a.impactLevel),
    dreamer: (a) =>
      ['Materials & Products', 'Technology', 'Market Trends'].includes(a.category) &&
      a.title.toLowerCase().includes('design') ||
      a.title.toLowerCase().includes('trend') ||
      a.title.toLowerCase().includes('innovation'),
    specialist: (a) =>
      ['Regulations', 'Technology', 'Safety'].includes(a.category) &&
      (a.title.toLowerCase().includes('code') ||
        a.title.toLowerCase().includes('standard') ||
        a.title.toLowerCase().includes('technique')),
    merchant: (a) =>
      ['Market Trends', 'Materials & Products'].includes(a.category) &&
      (a.title.toLowerCase().includes('price') ||
        a.title.toLowerCase().includes('supply') ||
        a.title.toLowerCase().includes('market') ||
        a.title.toLowerCase().includes('cost')),
    ally: (a) =>
      ['Regulations', 'Market Trends', 'Technology'].includes(a.category) &&
      a.impactLevel === 'High',
    crew: (a) =>
      ['Safety', 'Regulations'].includes(a.category) &&
      (a.title.toLowerCase().includes('safety') ||
        a.title.toLowerCase().includes('osha') ||
        a.title.toLowerCase().includes('protection') ||
        a.title.toLowerCase().includes('training')),
    fleet: (a) =>
      ['Equipment', 'Market Trends', 'Technology'].includes(a.category) ||
      a.title.toLowerCase().includes('equipment') ||
      a.title.toLowerCase().includes('rental'),
    machine: (a) =>
      ['Technology', 'Regulations'].includes(a.category) &&
      (a.title.toLowerCase().includes('api') ||
        a.title.toLowerCase().includes('data') ||
        a.title.toLowerCase().includes('automation') ||
        a.title.toLowerCase().includes('digital')),
  };

  const filter = laneFilterMap[lane];
  if (!filter) return articles;

  return articles.filter(filter).slice(0, 20);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lane = (searchParams.get('lane') || 'builder') as Lane;
  const action = searchParams.get('action');
  const refresh = searchParams.get('refresh') === 'true';

  // Handle sources list
  if (action === 'sources') {
    return NextResponse.json({
      sources: [
        { name: 'ENR', url: 'https://www.enr.com', category: 'Industry News' },
        { name: 'Construction Dive', url: 'https://www.constructiondive.com', category: 'Industry News' },
        { name: 'OSHA', url: 'https://www.osha.gov', category: 'Safety & Regulations' },
        { name: 'JLC', url: 'https://www.jlconline.com', category: 'Trade Skills' },
        { name: 'NAHB', url: 'https://www.nahb.org', category: 'Industry Trends' },
        { name: 'Equipment Today', url: 'https://www.equipmenttoday.com', category: 'Equipment & Rental' },
        { name: 'Tech in Construction', url: 'https://www.techinconstructionmag.com', category: 'Technology' },
        { name: 'Electrical Contractor', url: 'https://www.ecmag.com', category: 'Specialty Trades' },
      ],
    });
  }

  // Check cache
  if (!refresh && Date.now() - cacheTime < CACHE_TTL && cachedArticles.length > 0) {
    const laneFiltered = filterArticlesByLane(cachedArticles, lane);
    return NextResponse.json({
      articles: laneFiltered,
      cached: true,
      cacheAge: Date.now() - cacheTime,
    });
  }

  try {
    // In production, you would fetch from real RSS feeds or APIs here
    // For now, we're using the seed articles and would integrate with a real news source
    // Example integration points:
    // - RSS feed parsing (feedparser library)
    // - Construction news APIs
    // - Web scraping with attribution

    // Simulate fetching fresh articles
    cachedArticles = SEED_ARTICLES;
    cacheTime = Date.now();

    const laneFiltered = filterArticlesByLane(cachedArticles, lane);

    return NextResponse.json({
      articles: laneFiltered,
      cached: false,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    // Fall back to seed data
    const laneFiltered = filterArticlesByLane(SEED_ARTICLES, lane);
    return NextResponse.json({
      articles: laneFiltered,
      cached: true,
      fallback: true,
      error: 'Using cached/seed data',
    });
  }
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  if (action === 'save') {
    try {
      const body = await request.json();
      const { userId, article } = body;

      if (!userId || !article) {
        return NextResponse.json({ error: 'Missing userId or article' }, { status: 400 });
      }

      const supabase = getServiceClient();

      const { data, error } = await supabase.from('saved_articles').insert([
        {
          user_id: userId,
          article_id: article.id,
          article_data: article,
          saved_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        saved: data,
      });
    } catch (error) {
      console.error('Error saving article:', error);
      return NextResponse.json({ error: 'Failed to save article' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
