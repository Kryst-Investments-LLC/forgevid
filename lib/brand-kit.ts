/**
 * Resolve the branding applied to a render.
 *
 * This is the single place the plan gate is enforced for output: a free render
 * carries the ForgeVid watermark and ignores custom branding, no matter what
 * the client sent. Doing this in the browser would be decorative.
 *
 * Relative imports only — reachable from the worker process.
 */

import { prisma } from './prisma';
import { WATERMARK_TEXT, allowsCustomBranding, getUserPlan, requiresWatermark, type Plan } from './plan';

export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** What the renderer needs. Urls are materialized by the assembler. */
export interface Branding {
  plan: Plan;
  /** Burned-in watermark text; null for paid plans. */
  watermarkText: string | null;
  logoUrl: string | null;
  logoOpacity: number;
  logoPosition: LogoPosition;
  /** #RRGGBB used for caption text. */
  captionColor: string | null;
  /** Path/url of a .ttf for captions. */
  fontFile: string | null;
  introUrl: string | null;
  outroUrl: string | null;
}

const VALID_POSITIONS: LogoPosition[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
];

function normalizePosition(raw: string | null | undefined): LogoPosition {
  return VALID_POSITIONS.includes(raw as LogoPosition)
    ? (raw as LogoPosition)
    : 'bottom-right';
}

/** #RGB / #RRGGBB only — this value ends up inside an ffmpeg filtergraph. */
export function isValidHexColor(value: string | null | undefined): boolean {
  return typeof value === 'string' && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

export function freeBranding(plan: Plan = 'free'): Branding {
  return {
    plan,
    watermarkText: WATERMARK_TEXT,
    logoUrl: null,
    logoOpacity: 0.85,
    logoPosition: 'bottom-right',
    captionColor: null,
    fontFile: null,
    introUrl: null,
    outroUrl: null,
  };
}

/**
 * Branding for a user's render, gated by their plan.
 * Free (or unresolvable) plans get the watermark and nothing else.
 */
export async function resolveBranding(userId: string): Promise<Branding> {
  const plan = await getUserPlan(userId);

  if (!allowsCustomBranding(plan)) {
    return freeBranding(plan);
  }

  let kit = null;
  try {
    kit = await prisma.brandKit.findUnique({ where: { userId } });
  } catch (error) {
    console.error('[BrandKit] Lookup failed, rendering unbranded:', error);
  }

  const opacity = Number(kit?.logoOpacity);

  return {
    plan,
    // Paid plans render clean.
    watermarkText: requiresWatermark(plan) ? WATERMARK_TEXT : null,
    logoUrl: kit?.logoUrl ?? null,
    logoOpacity: Number.isFinite(opacity) ? Math.min(Math.max(opacity, 0), 1) : 0.85,
    logoPosition: normalizePosition(kit?.logoPosition),
    // Reject anything that isn't a hex colour rather than injecting it.
    captionColor: isValidHexColor(kit?.primaryColor) ? kit!.primaryColor! : null,
    fontFile: kit?.fontFamily ?? null,
    introUrl: kit?.introUrl ?? null,
    outroUrl: kit?.outroUrl ?? null,
  };
}

/** ffmpeg overlay x/y expressions for a corner, with a margin. */
export function overlayPosition(position: LogoPosition, margin = 24): string {
  switch (position) {
    case 'top-left':
      return `${margin}:${margin}`;
    case 'top-right':
      return `W-w-${margin}:${margin}`;
    case 'bottom-left':
      return `${margin}:H-h-${margin}`;
    case 'bottom-right':
    default:
      return `W-w-${margin}:H-h-${margin}`;
  }
}
