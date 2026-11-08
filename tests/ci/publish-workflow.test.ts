/**
 * Publish workflow must have a single trigger so a GitHub Release that
 * also creates tag v*.*.* does not run npm publish twice (second job 409s).
 */

import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const yaml = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../.github/workflows/publish.yml'),
  'utf8'
);

/** Top-level keys under `on:` in a simple GitHub Actions workflow file. */
export function workflowOnKeys(source: string): string[] {
  const lines = source.split('\n');
  const keys: string[] = [];
  let inOn = false;
  for (const line of lines) {
    if (!inOn) {
      if (line === 'on:') {
        inOn = true;
      }
      continue;
    }
    if (line.startsWith('#') || line.trim() === '') {
      continue;
    }
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      break;
    }
    const match = line.match(/^\s{2}([A-Za-z][\w-]*)\s*:/);
    if (match) {
      keys.push(match[1]);
    }
  }
  return keys;
}

describe('publish.yml', () => {
  it('publishes only on version tag push, not also on release published', () => {
    expect(workflowOnKeys(yaml)).toEqual(['push']);
    expect(yaml).toMatch(/tags:\s*\n\s+- 'v\*\.\*\.\*'/);
    expect(yaml).not.toMatch(/^on:\s*\n(?:.*\n)*?\s{0,2}release:/m);
  });

  it('still runs npm publish once and does not swallow 409 in the publish step', () => {
    const publishes = yaml.match(/^\s+run:\s*npm publish\s*$/gm) ?? [];
    expect(publishes).toHaveLength(1);
    const step = yaml.slice(yaml.indexOf('name: Publish to GitHub Packages'));
    expect(step).not.toMatch(/\|\|/);
    expect(step).not.toMatch(/continue-on-error/);
  });

  it('documents why release is not a second trigger', () => {
    expect(yaml).toMatch(/409/);
    expect(yaml).toMatch(/tag/);
  });
});

describe('workflowOnKeys', () => {
  it('flags the historical dual trigger that 409s the second publish', () => {
    const dual = [
      'name: Publish Package',
      'on:',
      '  push:',
      "    tags:",
      "      - 'v*.*.*'",
      '  release:',
      '    types: [published]',
      'jobs:',
      '  publish:',
      '    runs-on: ubuntu-latest',
    ].join('\n');
    expect(workflowOnKeys(dual)).toEqual(['push', 'release']);
  });
});
