/**
 * Turning a scene into a stock-footage search term.
 *
 * This module exists because of a real failure. Scene descriptions were being
 * used directly as Pexels queries by taking their first six words, so
 *
 *   "Close-up of person's smile watching finished video"
 *      -> query "Close-up of person's smile watching finished"
 *      -> a lipstick and makeup-brush clip
 *
 * A description is prose for a human; a query is a bag of concrete, filmable
 * nouns for a search index. They are not the same string, and conflating them
 * is what put a makeup advert in the middle of a video-editing promo.
 *
 * The planner now emits an explicit `searchQuery` per scene. `sanitizeStockQuery`
 * is the safety net for scenes planned before that existed, for a user's typed
 * query, and for a model that ignores instructions.
 *
 * Pure — no I/O — so it is verified offline.
 */

import type { PlannedScene } from './video-generator';

/**
 * Camera and edit-room language. These words describe how a shot is filmed,
 * never what is IN it, so they only add noise to a stock search.
 */
const FILM_GRAMMAR = [
  'opening with',
  'opening shot of',
  'closing with',
  'close-up of',
  'close up of',
  'closeup of',
  'extreme close-up of',
  'wide shot of',
  'wide angle of',
  'medium shot of',
  'establishing shot of',
  'over-the-shoulder view of',
  'over the shoulder view of',
  'over-the-shoulder shot of',
  'point of view of',
  'pov of',
  'aerial view of',
  'top-down view of',
  'shot of',
  'footage of',
  'b-roll of',
  'cut to',
  'scene of',
  'view of',
  'image of',
  'montage of',
  'timelapse of',
  'time-lapse of',
  'slow motion of',
];

/** Words that carry no visual meaning for an image search. */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'of', 'with', 'and', 'or', 'on', 'in', 'at', 'to', 'for',
  'from', 'by', 'as', 'is', 'are', 'was', 'were', 'be', 'being', 'been',
  'their', 'his', 'her', 'its', 'our', 'your', 'my', 'they', 'he', 'she', 'it',
  'this', 'that', 'these', 'those', 'while', 'then', 'into', 'onto', 'up',
  'down', 'out', 'over', 'under', 'very', 'really',
]);

/**
 * Abstract nouns that retrieve mood-board junk instead of the subject. The
 * "smile" bug: emotion words outrank the actual subject in stock indexes,
 * because stock libraries are saturated with beauty and lifestyle imagery.
 */
const ABSTRACT_WORDS = new Set([
  'satisfaction', 'satisfied', 'pleased', 'happiness', 'joy', 'excitement',
  'aspirational', 'cinematic', 'sleek', 'premium', 'production', 'value',
  'high', 'quality', 'beautiful', 'stunning', 'gorgeous', 'amazing',
  'feeling', 'emotion', 'vibe', 'atmosphere', 'mood', 'sense', 'concept',
  'finished', 'final', 'result', 'success', 'successful',
  // Facial expressions retrieve beauty/lifestyle stock instead of the subject
  // — this is the exact "smile" that put a lipstick clip in a video promo.
  'smile', 'smiling', 'laughing', 'grinning', 'expression', 'happy', 'proud',
  // Weak spectating verbs that add no visual specificity to a search.
  'watching', 'looking', 'viewing', 'staring', 'seeing', 'enjoying',
]);

/** Maximum tokens a stock query should carry before it over-constrains. */
const MAX_QUERY_TOKENS = 5;

/**
 * Reduce prose to a searchable phrase: strip camera grammar, possessives,
 * punctuation, stop words and abstractions, then keep the leading concrete
 * tokens.
 *
 * Never returns an empty string when given any word at all — an empty query
 * would search for nothing and silently return the stock provider's front page.
 */
export function sanitizeStockQuery(text: string): string {
  let working = (text || '').toLowerCase().trim();
  if (!working) return '';

  // Camera grammar is only noise at the START of a phrase; "a laptop shot of
  // coffee" is nonsense, but "over-the-shoulder view of a laptop" is common.
  let changed = true;
  while (changed) {
    changed = false;
    for (const phrase of FILM_GRAMMAR) {
      if (working.startsWith(`${phrase} `)) {
        working = working.slice(phrase.length + 1);
        changed = true;
      }
    }
  }

  const tokens = working
    .replace(/'s\b/g, '') // person's -> person
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const concrete = tokens.filter(
    (token) => !STOP_WORDS.has(token) && !ABSTRACT_WORDS.has(token) && token.length > 1,
  );

  // If stripping abstractions emptied the phrase, keep the non-stop words: a
  // weak query still beats no query.
  const kept = concrete.length > 0 ? concrete : tokens.filter((t) => !STOP_WORDS.has(t));
  const final = kept.length > 0 ? kept : tokens;

  return final.slice(0, MAX_QUERY_TOKENS).join(' ');
}

/**
 * The ordered list of queries to try for one scene, best first:
 *
 *   1. the planner's (or the user's) explicit search query
 *   2. the sanitized description
 *   3. each keyword, and finally pairs of keywords, which are more specific
 *      than a lone word like "laptop"
 *
 * Deduped, because retrying an identical query wastes an API call per scene.
 */
export function buildSceneQueries(scene: Pick<PlannedScene, 'description' | 'keywords'> & { searchQuery?: string }): string[] {
  const queries: string[] = [];

  const explicit = sanitizeStockQuery(scene.searchQuery ?? '');
  if (explicit) queries.push(explicit);

  const fromDescription = sanitizeStockQuery(scene.description ?? '');
  if (fromDescription) queries.push(fromDescription);

  const keywords = (scene.keywords ?? []).map((k) => sanitizeStockQuery(k)).filter(Boolean);

  // A pair is more discriminating than either word alone ("laptop editing"
  // beats "laptop"), so pairs are tried before falling back to single words.
  if (keywords.length >= 2) queries.push(`${keywords[0]} ${keywords[1]}`);
  queries.push(...keywords);

  const seen = new Set<string>();
  return queries.filter((q) => {
    if (!q || seen.has(q)) return false;
    seen.add(q);
    return true;
  });
}
