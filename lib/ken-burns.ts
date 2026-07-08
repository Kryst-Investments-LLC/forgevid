/**
 * Ken Burns: slow zoom/pan applied to still images.
 *
 * A static photo held for several seconds reads as a broken video. `zoompan`
 * animates it. Two details matter:
 *
 *  1. zoompan samples the SOURCE frame, so zooming a frame that is already at
 *     output resolution produces visible stair-stepping. Upscale first, then
 *     zoom, then let zoompan emit at the output size.
 *  2. `d` is measured in FRAMES, not seconds.
 *
 * Relative imports only — reachable from the worker process.
 */

export type KenBurnsDirection = 'in' | 'out';

/** Supersampling factor before zoompan, to keep the zoom smooth. */
const UPSCALE = 2;
/** Total zoom travel over the clip. 1.15 = a 15% push. */
const ZOOM_TRAVEL = 0.15;

export interface KenBurnsOptions {
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  direction?: KenBurnsDirection;
}

/**
 * A filter chain turning a still image into a gently moving clip.
 * Feed it an image input (`-loop 1 -t <duration>`).
 */
export function buildKenBurnsFilter({
  width,
  height,
  fps,
  durationSeconds,
  direction = 'in',
}: KenBurnsOptions): string {
  const frames = Math.max(1, Math.round(durationSeconds * fps));
  // Per-frame zoom step so the travel completes exactly at the last frame.
  const step = (ZOOM_TRAVEL / frames).toFixed(6);
  const maxZoom = (1 + ZOOM_TRAVEL).toFixed(3);

  // `in`: push from 1.0 up to maxZoom. `out`: pull from maxZoom back to 1.0.
  const zoomExpr =
    direction === 'in'
      ? `min(zoom+${step},${maxZoom})`
      : `if(lte(zoom,1.0),${maxZoom},max(zoom-${step},1.0))`;

  const big = `${width * UPSCALE}:${height * UPSCALE}`;

  return (
    // Cover the frame at supersampled size, then crop to exact dimensions.
    `scale=${big}:force_original_aspect_ratio=increase,crop=${big},` +
    // Keep the zoom centred.
    `zoompan=z='${zoomExpr}':d=${frames}:s=${width}x${height}:fps=${fps}:` +
    `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',` +
    `setsar=1`
  );
}

/** Alternate direction per scene so a photo montage doesn't feel mechanical. */
export function directionForScene(index: number): KenBurnsDirection {
  return index % 2 === 0 ? 'in' : 'out';
}
