/**
 * /killerapp/dream-studio-2 — RETIRED → /killerapp/dream-studio.
 * ===============================================================
 * The v2 surface was a static design mock (the "Twin Peaks" demo literal — no
 * live generation, no real assets, no persistence). The working, on-brand
 * Dream Machine is /killerapp/dream-studio (live FLUX generation from the
 * user's brief + real seeds + blueprint + Build handoff), so this route now
 * points there.
 *
 * Temporary redirect (307) on purpose — the mock client (DreamStudio2Client /
 * dm2-data / dream-studio-2.css) is preserved in this folder so its "spine"
 * structure can be ported onto the live engine later without git archaeology.
 */
import { redirect } from 'next/navigation';

export default function DreamStudio2Page() {
  redirect('/killerapp/dream-studio');
}
