import {
  analyzeEmotion,
  generateEmotionAwareScript,
  selectAssetsForEmotion,
} from '@/features/emotion-ai'

describe('Emotion AI Features', () => {
  it.each([
    ['I am excited about this amazing project!', 'excited'],
    ['I am happy and love this wonderful result.', 'happy'],
    ['I am furious and angry about this terrible result.', 'angry'],
    ['This is a factual status update.', 'neutral'],
  ])('classifies %s as %s', async (text, expected) => {
    const result = await analyzeEmotion(text)
    expect(result.emotion).toBe(expected)
    expect(result.confidence).toBeGreaterThanOrEqual(0.5)
    expect(result.sentimentScore).toBeGreaterThanOrEqual(-1)
    expect(result.sentimentScore).toBeLessThanOrEqual(1)
  })

  it('maps an emotion to a complete production recommendation', () => {
    const result = selectAssetsForEmotion('excited')
    expect(result.pacing).toBe('fast')
    expect(result.musicTracks.length).toBeGreaterThan(0)
    expect(result.transitions.length).toBeGreaterThan(0)
    expect(result.colorSchemes.length).toBeGreaterThan(0)
  })

  it('adds an appropriate delivery cue without changing the source script', async () => {
    const source = 'Welcome to our quarterly presentation.'
    const result = await generateEmotionAwareScript(source, 'neutral')
    expect(result.startsWith(source)).toBe(true)
    expect(result).toMatch(/\(delivered (clearly|professionally|straightforwardly|calmly)\)$/)
  })
})
