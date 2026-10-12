import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENTITY_TYPES } from '../src/entities/params';
import { entityReference, splice } from './docs-gen';

describe('README', () => {
  it('has an up-to-date entity reference (run `npm run docs` to refresh)', () => {
    const readme = readFileSync('README.md', 'utf8');
    const fresh = splice(readme);
    if (process.env.DOCS_WRITE) writeFileSync('README.md', fresh);
    else expect(readme).toBe(fresh);
  });

  it('documents every entity type', () => {
    const ref = entityReference();
    for (const t of ENTITY_TYPES) expect(ref).toContain(`| \`${t}\` |`);
  });
});
