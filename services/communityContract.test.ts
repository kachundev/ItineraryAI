import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { attachProfiles, isPersistedItineraryId } from './communityContract.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const APP_FILES = ['App.tsx', 'types.ts', 'translations.ts'];
const APP_DIRS = ['pages', 'components', 'services', 'contexts', 'lib'];

function sourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...sourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

test('only saved itinerary ids can be published or discussed', () => {
  assert.equal(isPersistedItineraryId(undefined), false);
  assert.equal(isPersistedItineraryId(''), false);
  assert.equal(isPersistedItineraryId('temp-1730000000000'), false);
  assert.equal(isPersistedItineraryId('not-a-uuid'), false);
  assert.equal(isPersistedItineraryId('3f1c2a70-6b1e-4d2a-9c31-0a6e5b7d8f90'), true);
});

test('comment authors are matched by user id without an embed', () => {
  const rows = [
    { id: 'c1', user_id: 'user-a', content: 'Hi' },
    { id: 'c2', user_id: 'missing', content: 'Hello' },
  ];
  const attached = attachProfiles(rows, [
    { id: 'user-a', full_name: 'Ava', avatar_url: 'https://example.com/a.png' },
  ]);
  assert.equal(attached[0].profiles?.full_name, 'Ava');
  assert.equal(attached[1].profiles, null);
  assert.equal(attached[0].content, 'Hi');
});

test('app source does not query comments or like-count RPCs', () => {
  const files = [
    ...APP_FILES.map((file) => path.join(ROOT, file)),
    ...APP_DIRS.flatMap((dir) => sourceFiles(path.join(ROOT, dir))),
  ];
  const banned = [
    /\.from\(\s*['"]comments['"]\s*\)/,
    /increment_likes/,
    /decrement_likes/,
  ];
  const hits: string[] = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of banned) {
      if (pattern.test(text)) hits.push(`${path.relative(ROOT, file)} matches ${pattern}`);
    }
  }
  assert.deepEqual(hits, []);
});

test('community client uses the live tables and never writes the like counter', () => {
  const source = fs.readFileSync(path.join(ROOT, 'services/community.ts'), 'utf8');
  assert.match(source, /\.from\(\s*'itinerary_comments'\s*\)/);
  assert.match(source, /\.from\(\s*'itinerary_likes'\s*\)/);
  assert.match(source, /\.from\(\s*'itinerary_saves'\s*\)/);
  assert.match(source, /is_public:\s*isPublic/);
  assert.doesNotMatch(source, /increment_likes|decrement_likes|\.from\(\s*['"]comments['"]\s*\)|\blikes\s*:/);
});
