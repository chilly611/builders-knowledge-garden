/**
 * Server-only filesystem loader for contract template bodies.
 *
 * Keep all `node:fs` + `node:path` imports behind the `server-only` boundary
 * so that client components can safely `import { TEMPLATE_META, fillTemplate }
 * from '@/lib/contract-templates'` without Webpack trying to bundle Node
 * built-ins for the browser.
 */

import 'server-only';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { TEMPLATE_META, type TemplateBodies } from './contract-templates';

/**
 * Read all 6 markdown bodies from disk and return a map keyed by template id.
 * Call this in a Server Component and pass the result as a prop to the client.
 */
export async function getTemplateBodies(): Promise<TemplateBodies> {
  const dir = path.join(process.cwd(), 'src', 'lib', 'contract-templates');
  const entries = await Promise.all(
    TEMPLATE_META.map(async (meta) => {
      const filePath = path.join(dir, meta.bodyFile);
      const body = await fs.readFile(filePath, 'utf8');
      return [meta.id, body] as const;
    })
  );
  return Object.fromEntries(entries);
}
