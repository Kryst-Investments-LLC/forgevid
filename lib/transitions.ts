/**
 * Cross-fades between scenes.
 *
 * The pipeline concatenated clips with hard cuts. `xfade` OVERLAPS the two
 * clips it joins, so a naive chain shortens the video by `(n-1) * duration` —
 * which desyncs the (fixed-length) narration and makes every caption late.
 *
 * Instead, each clip except the last is rendered `duration` seconds longer, so
 * the overlaps consume exactly the padding and the total stays `sum(sceneDurations)`.
 * Scene boundaries still land on their original timestamps, so caption cues need
 * no adjustment.
 *
 * Relative imports only — reachable from the worker process.
 */

/** xfade transitions worth exposing. `fade` is the safe default. */
export const TRANSITIONS = [
  'fade',
  'fadeblack',
  'fadewhite',
  'wipeleft',
  'wiperight',
  'slideleft',
  'slideright',
  'circleopen',
  'dissolve',
] as const;

export type TransitionType = (typeof TRANSITIONS)[number];

export interface TransitionConfig {
  type: TransitionType;
  /** Seconds of overlap between consecutive scenes. */
  duration: number;
}

export const DEFAULT_TRANSITION: TransitionConfig = { type: 'fade', duration: 0.5 };

export function isTransitionType(value: unknown): value is TransitionType {
  return typeof value === 'string' && (TRANSITIONS as readonly string[]).includes(value);
}

/**
 * A transition cannot be longer than the shortest scene it touches, or the
 * overlaps consume an entire clip. Clamp to half the shortest scene.
 * Returns 0 when transitions are not viable (single scene, or scenes too short).
 */
export function clampTransitionDuration(
  requested: number,
  sceneDurations: number[],
): number {
  if (sceneDurations.length < 2) return 0;
  const shortest = Math.min(...sceneDurations);
  const max = Math.max(0, shortest / 2);
  const clamped = Math.min(Math.max(requested, 0), max);
  // Below ~100ms a cross-fade is indistinguishable from a cut; skip the extra pass.
  return clamped < 0.1 ? 0 : Number(clamped.toFixed(3));
}

/**
 * How long each clip must be rendered so the overlaps preserve total duration:
 * every clip but the last carries `transitionDuration` of padding.
 */
export function paddedClipDurations(
  sceneDurations: number[],
  transitionDuration: number,
): number[] {
  if (transitionDuration <= 0) return [...sceneDurations];
  return sceneDurations.map((d, i) =>
    i === sceneDurations.length - 1 ? d : d + transitionDuration,
  );
}

export interface XfadeChain {
  /** filter_complex statements, to be joined with ';'. */
  filters: string[];
  /** Label of the final video stream, without brackets. */
  outputLabel: string;
}

/**
 * Chain `clipDurations.length` video inputs together with cross-fades.
 * Input i is ffmpeg input index i. Assumes every clip is already normalized to
 * the same size / fps / pix_fmt / SAR (xfade requires it).
 */
export function buildXfadeChain(
  clipDurations: number[],
  transition: TransitionConfig,
): XfadeChain {
  const n = clipDurations.length;
  if (n < 2 || transition.duration <= 0) {
    return { filters: [], outputLabel: '0:v' };
  }

  const filters: string[] = [];
  let previous = '[0:v]';
  // `cursor` tracks the length of the stream built so far.
  let cursor = clipDurations[0];

  for (let i = 1; i < n; i++) {
    const offset = cursor - transition.duration;
    const label = i === n - 1 ? 'vxout' : `vx${i}`;
    filters.push(
      `${previous}[${i}:v]xfade=transition=${transition.type}:` +
        `duration=${transition.duration}:offset=${Math.max(0, offset).toFixed(3)}[${label}]`,
    );
    previous = `[${label}]`;
    cursor = cursor + clipDurations[i] - transition.duration;
  }

  return { filters, outputLabel: 'vxout' };
}

/** Total duration of an xfade chain — should equal sum(sceneDurations). */
export function xfadeTotalDuration(
  clipDurations: number[],
  transitionDuration: number,
): number {
  const sum = clipDurations.reduce((a, b) => a + b, 0);
  const overlaps = Math.max(0, clipDurations.length - 1) * transitionDuration;
  return sum - overlaps;
}
