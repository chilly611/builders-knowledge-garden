/**
 * /owner layout — loads the Owner Lane stylesheet for this route subtree.
 *
 * `owner-lane.css` is entirely scoped under `.ol-root` (every selector is
 * `ol-` prefixed and reads herbarium tokens from the root `tokens.css`), so
 * importing it here loads it only for `/owner` without leaking globally.
 *
 * No <html>/<body> here — the root layout owns the document shell, the
 * fonts, the providers, and the global compass-bloom + "Ask the garden" fab
 * (GlobalChromeGate), which is exactly the design's `PersistentNav`. This
 * layout is a thin CSS-loading wrapper only.
 */

import './owner-lane.css';

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
