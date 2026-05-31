import { describe, expect, it } from 'vitest';
import { findEnabledAdminSourceByKey } from './_sources';
import type { SourceConfig } from '../../../../src/ingestion';

const source: SourceConfig = {
  key: 'snapi',
  name: 'Spaceflight News',
  type: 'api',
  region: 'global',
  url: 'https://api.spaceflightnewsapi.net/v4/articles/',
  credibility: 5,
  enabled: true,
  purpose: 'News metadata.',
  expected_content: 'Article metadata.',
  risk_notes: 'Public API.',
  dedupe_strategy: 'url_title_source',
};

describe('admin ingest source selection', () => {
  it('returns enabled sources by key', () => {
    expect(findEnabledAdminSourceByKey([source], 'snapi')).toBe(source);
  });

  it('treats disabled or missing sources as unavailable', () => {
    expect(findEnabledAdminSourceByKey([{ ...source, enabled: false }], 'snapi')).toBeNull();
    expect(findEnabledAdminSourceByKey([source], 'launch-library-2')).toBeNull();
  });
});
