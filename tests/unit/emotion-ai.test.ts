import { describe, it, expect } from '@jest/globals'
import { 
  analyzeEmotion, 
  selectAssetsForEmotion, 
  generateEmotionAwareScript 
} from '@/features/emotion-ai'

describe('Emotion AI Features', () => {
  describe('analyzeEmotion', () => {
    it('should detect positive emotion in happy text', () => {
      const result = analyzeEmotion('I am so excited and happy about this amazing project!')
      
      expect(result.primary).toBe('joy')
      expect(result.confidence).toBeGreaterThan(0.8)
      expect(result.dimensions.arousal).toBeGreaterThan(0.5)
      expect(result.dimensions.valence).toBeGreaterThan(0.5)
    })

    it('should detect negative emotion in sad text', () => {
      const result = analyzeEmotion('I feel devastated and heartbroken about the loss.')
      
      expect(result.primary).toBe('sadness')
      expect(result.confidence).toBeGreaterThan(0.7)
      expect(result.dimensions.valence).toBeLessThan(0.5)
    })

    it('should detect anger in aggressive text', () => {
      const result = analyzeEmotion('I am furious and outraged by this terrible situation!')
      
      expect(result.primary).toBe('anger')
      expect(result.confidence).toBeGreaterThan(0.7)
      expect(result.dimensions.arousal).toBeGreaterThan(0.7)
      expect(result.dimensions.valence).toBeLessThan(0.5)
    })

    it('should handle neutral text', () => {
      const result = analyzeEmotion('The weather is partly cloudy today.')
      
      expect(result.primary).toBe('neutral')
      expect(result.dimensions.arousal).toBeLessThan(0.6)
      expect(Math.abs(result.dimensions.valence - 0.5)).toBeLessThan(0.3)
    })
  })

  describe('selectAssetsForEmotion', () => {
    const mockAssets = [
      { id: '1', type: 'music', tags: ['upbeat', 'energetic'], emotion_tags: ['joy'] },
      { id: '2', type: 'music', tags: ['calm', 'peaceful'], emotion_tags: ['serenity'] },
      { id: '3', type: 'visual', tags: ['dark', 'moody'], emotion_tags: ['sadness'] },
      { id: '4', type: 'visual', tags: ['bright', 'colorful'], emotion_tags: ['joy'] },
      { id: '5', type: 'transition', tags: ['smooth'], emotion_tags: ['neutral'] }
    ]

    it('should select appropriate assets for joy emotion', () => {
      const emotion = { primary: 'joy', confidence: 0.9, dimensions: { arousal: 0.8, valence: 0.9 } }
      const result = selectAssetsForEmotion(emotion, mockAssets)
      
      expect(result).toContain(mockAssets[0]) // upbeat music
      expect(result).toContain(mockAssets[3]) // bright visual
      expect(result).not.toContain(mockAssets[2]) // dark visual
    })

    it('should select appropriate assets for sadness emotion', () => {
      const emotion = { primary: 'sadness', confidence: 0.8, dimensions: { arousal: 0.3, valence: 0.2 } }
      const result = selectAssetsForEmotion(emotion, mockAssets)
      
      expect(result).toContain(mockAssets[1]) // calm music
      expect(result).toContain(mockAssets[2]) // dark visual
      expect(result).not.toContain(mockAssets[0]) // upbeat music
    })

    it('should return diverse asset types', () => {
      const emotion = { primary: 'joy', confidence: 0.9, dimensions: { arousal: 0.8, valence: 0.9 } }
      const result = selectAssetsForEmotion(emotion, mockAssets)
      
      const types = new Set(result.map(asset => asset.type))
      expect(types.size).toBeGreaterThan(1) // Should have multiple asset types
    })
  })

  describe('generateEmotionAwareScript', () => {
    it('should adapt script for high-energy positive content', () => {
      const emotion = { primary: 'joy', confidence: 0.9, dimensions: { arousal: 0.9, valence: 0.9 } }
      const baseScript = 'Welcome to our presentation about quarterly results.'
      
      const result = generateEmotionAwareScript(baseScript, emotion)
      
      expect(result.adaptedScript).toContain('exciting')
      expect(result.pacing).toBe('fast')
      expect(result.tone).toBe('enthusiastic')
      expect(result.visualCues).toContain('dynamic')
    })

    it('should adapt script for calm, peaceful content', () => {
      const emotion = { primary: 'serenity', confidence: 0.8, dimensions: { arousal: 0.2, valence: 0.7 } }
      const baseScript = 'Today we will explore meditation techniques.'
      
      const result = generateEmotionAwareScript(baseScript, emotion)
      
      expect(result.adaptedScript).toContain('gentle')
      expect(result.pacing).toBe('slow')
      expect(result.tone).toBe('calm')
      expect(result.visualCues).toContain('smooth')
    })

    it('should adapt script for serious, professional content', () => {
      const emotion = { primary: 'neutral', confidence: 0.9, dimensions: { arousal: 0.4, valence: 0.5 } }
      const baseScript = 'This quarterly report shows our financial performance.'
      
      const result = generateEmotionAwareScript(baseScript, emotion)
      
      expect(result.pacing).toBe('moderate')
      expect(result.tone).toBe('professional')
      expect(result.recommendations).toContain('clear')
    })
  })
})