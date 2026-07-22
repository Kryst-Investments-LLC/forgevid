/**
 * lib/voiceover.ts peekCachedSegments unit tests.
 *
 * peekCachedSegments must classify a scene as cached WITHOUT ever calling the
 * synth function (zero API spend) — it is the pre-flight check
 * rerenderVideo (lib/generation-pipeline.ts) uses to decide whether a
 * re-render is a free cosmetic edit or a metered narration edit. `fs` is
 * mocked with an in-memory file set so the test never touches the real
 * .cache/tts directory.
 */
import { describe, it, expect, beforeEach } from '@jest/globals'
// NOTE: `jest` itself is intentionally the ambient global here, not imported
// from '@jest/globals' — with this repo's next/jest (SWC) transform, importing
// it breaks jest.mock() hoisting and the mock silently never applies.

const existingFiles = new Set<string>()

jest.mock('fs', () => ({
  existsSync: jest.fn((p: string) => existingFiles.has(p)),
  statSync: jest.fn((p: string) => ({ size: existingFiles.has(p) ? 1024 : 0 })),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn((p: string) => {
    existingFiles.add(p)
  }),
  rmSync: jest.fn((p: string) => {
    existingFiles.delete(p)
  }),
}))

import fs from 'fs'
import path from 'path'
import { peekCachedSegments, sceneCacheKey } from '@/lib/voiceover'

describe('peekCachedSegments', () => {
  beforeEach(() => {
    existingFiles.clear()
    jest.clearAllMocks()
  })

  it('returns cached:false for a scene with no cache file, without synthesizing anything', () => {
    const scenes = [{ id: 'scene-1', description: 'Hello world' }]

    const result = peekCachedSegments(scenes, 'voice-1')

    expect(result).toEqual([{ sceneId: 'scene-1', cached: false, chars: 'Hello world'.length }])
    // The whole point: no synth call was made, so nothing was written to cache.
    expect(fs.writeFileSync).not.toHaveBeenCalled()
  })

  it('returns cached:true once a stub file exists at the exact key peekCachedSegments computes', () => {
    const scenes = [{ id: 'scene-1', description: 'Hello world' }]
    const voiceId = 'voice-1'

    // Reuses the SAME key function the real synth path uses, per the cache
    // contract — that's what makes "cached here" mean "the real call would
    // also hit cache".
    const key = sceneCacheKey('Hello world', voiceId)
    const file = path.join(process.cwd(), '.cache', 'tts', `${key}.mp3`)
    fs.writeFileSync(file, Buffer.from('stub-audio'))

    const result = peekCachedSegments(scenes, voiceId)

    expect(result).toEqual([{ sceneId: 'scene-1', cached: true, chars: 'Hello world'.length }])
  })

  it('classifies each scene independently — a mixed cache hit/miss set', () => {
    const voiceId = 'voice-1'
    const cachedText = 'This scene is already cached'
    const missingText = 'This scene was just edited'
    const key = sceneCacheKey(cachedText, voiceId)
    const file = path.join(process.cwd(), '.cache', 'tts', `${key}.mp3`)
    fs.writeFileSync(file, Buffer.from('stub-audio'))

    const result = peekCachedSegments(
      [
        { id: 'scene-1', description: cachedText },
        { id: 'scene-2', description: missingText },
      ],
      voiceId,
    )

    expect(result).toEqual([
      { sceneId: 'scene-1', cached: true, chars: cachedText.length },
      { sceneId: 'scene-2', cached: false, chars: missingText.length },
    ])
  })

  it('falls back to the default voice when none is supplied, without throwing', () => {
    const scenes = [{ id: 'scene-1', description: 'No voice specified' }]

    expect(() => peekCachedSegments(scenes)).not.toThrow()
  })
})
