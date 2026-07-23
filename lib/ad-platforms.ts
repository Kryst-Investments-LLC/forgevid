/**
 * Ad Studio platform presets. Each target platform maps to the aspect ratio,
 * caption style, recommended length and hook guidance that actually perform
 * there — so a marketer picks "TikTok" and gets 9:16 + karaoke captions + a
 * short, hook-first cut without fiddling with knobs.
 */

export type AdPlatformKey = 'tiktok' | 'reels' | 'shorts' | 'meta' | 'youtube'

export type AdAspect = '16:9' | '9:16' | '1:1'

export interface AdPlatform {
  key: AdPlatformKey
  label: string
  aspect: AdAspect
  /** Caption preset hint passed through to the render (karaoke vs clean). */
  captionStyle: 'karaoke' | 'clean'
  /** Recommended length in seconds. */
  durationSec: number
  /** Short hook guidance surfaced in the UI + fed to the hook generator. */
  hookNote: string
}

export const AD_PLATFORMS: Record<AdPlatformKey, AdPlatform> = {
  tiktok: { key: 'tiktok', label: 'TikTok', aspect: '9:16', captionStyle: 'karaoke', durationSec: 25, hookNote: 'Hook in the first 1–2s; native, hand-held, talking-to-camera feel.' },
  reels: { key: 'reels', label: 'Instagram Reels', aspect: '9:16', captionStyle: 'karaoke', durationSec: 25, hookNote: 'Fast visual hook; trending-audio friendly; punchy captions.' },
  shorts: { key: 'shorts', label: 'YouTube Shorts', aspect: '9:16', captionStyle: 'karaoke', durationSec: 30, hookNote: 'Punchy hook with a clear payoff by ~3s.' },
  meta: { key: 'meta', label: 'Meta Feed', aspect: '1:1', captionStyle: 'clean', durationSec: 20, hookNote: 'Must work muted — put the hook on-screen as text; cleaner captions.' },
  youtube: { key: 'youtube', label: 'YouTube', aspect: '16:9', captionStyle: 'clean', durationSec: 30, hookNote: 'Front-load the value; a strong spoken first line.' },
}

export const AD_PLATFORM_LIST: AdPlatform[] = Object.values(AD_PLATFORMS)

export function getAdPlatform(key: string | null | undefined): AdPlatform {
  return (key && AD_PLATFORMS[key as AdPlatformKey]) || AD_PLATFORMS.tiktok
}
