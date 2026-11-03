import type { TrackablesApi } from '@brainforgeau/tracking-client';

/** tracking-backend accepts at most this many subject ids per lookup. */
export const SUBJECT_IDS_PER_LOOKUP = 100;

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

/**
 * The lowercased ids, out of `lowerIds`, that Tracking holds a trackable for.
 * One lookup per chunk of 100; each option's code is the subject id.
 */
export const lookupTrackedAssetIds = async (
  client: Pick<TrackablesApi, 'v1TrackablesOptionsGet'>,
  lowerIds: string[],
  signal?: AbortSignal,
): Promise<Set<string>> => {
  const pages = await Promise.all(
    chunk(lowerIds, SUBJECT_IDS_PER_LOOKUP).map(subjectIds =>
      client.v1TrackablesOptionsGet(
        undefined, // search
        1, // page
        SUBJECT_IDS_PER_LOOKUP * 2, // pageSize
        undefined, // ids
        undefined, // isTrackingActive
        subjectIds, // subjectExternalIds
        { signal },
      ),
    ),
  );
  const tracked = new Set<string>();
  for (const { data } of pages) {
    for (const option of data?.items ?? []) {
      if (option.code) tracked.add(option.code.toLowerCase());
    }
  }
  return tracked;
};
