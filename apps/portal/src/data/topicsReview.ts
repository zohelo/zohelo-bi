// Review switch for hot topics: `?tematy=przeglad` makes the topics provider read the internal review copy
// 06_published/v1/review/topics.json (zohelo-data docs/topics.md, "Internal review"; served signed-in at
// /api/published/v1/review/topics.json) instead of the published or sample topics, in sample mode too, so the
// owner can judge the real ranking before switching topics on. Kept in sessionStorage for the session; any other
// value of `?tematy=` turns it off. Without the switch nothing changes. Pages show a banner while it is on.

import { api, ApiError } from "../api";
import type { Topics } from "./types";

export const REVIEW_PARAM = "tematy";
export const REVIEW_VALUE = "przeglad";
export const REVIEW_KEY = "zohelo-bi.tematy";

function sessionStore(): Storage | undefined {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
}

/** Whether the review switch is on, from the address (`search`) first, then the session. */
export function topicsReview(search: string = globalThis.location?.search ?? "", storage: Storage | undefined = sessionStore()): boolean {
  const asked = new URLSearchParams(search).get(REVIEW_PARAM);
  if (asked !== null) {
    const on = asked === REVIEW_VALUE;
    try {
      if (on) storage?.setItem(REVIEW_KEY, REVIEW_VALUE);
      else storage?.removeItem(REVIEW_KEY);
    } catch {
      /* storage blocked: the switch lasts for this address only */
    }
    return on;
  }
  try {
    return storage?.getItem(REVIEW_KEY) === REVIEW_VALUE;
  } catch {
    return false;
  }
}

/** The internal review copy of topics.json; null when there is none (the UI then hides topics). */
export async function reviewTopics(): Promise<Topics | null> {
  try {
    return await api.reviewTopics();
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}
