// Emotion & Sentiment Analysis Implementation
export type Emotion = 'happy' | 'sad' | 'excited' | 'angry' | 'neutral';

interface EmotionAnalysisResult {
  emotion: Emotion;
  confidence: number;
  sentimentScore: number;
}

interface AssetRecommendation {
  musicTracks: string[];
  transitions: string[];
  colorSchemes: string[];
  pacing: 'slow' | 'medium' | 'fast';
}

export async function analyzeEmotion(text: string): Promise<EmotionAnalysisResult> {
  try {
    // Use a simple sentiment analysis approach
    // In production, integrate with OpenAI, Azure Cognitive Services, or AWS Comprehend
    const positiveWords = ['happy', 'joy', 'excited', 'love', 'amazing', 'great', 'wonderful', 'fantastic', 'awesome'];
    const negativeWords = ['sad', 'angry', 'hate', 'terrible', 'awful', 'bad', 'horrible', 'disgusting'];
    const excitedWords = ['excited', 'energetic', 'pump', 'hyped', 'thrilled', 'amazing', 'incredible'];
    
    const words = text.toLowerCase().split(/\W+/);
    
    let positiveCount = 0;
    let negativeCount = 0;
    let excitedCount = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
      if (excitedWords.includes(word)) excitedCount++;
    });
    
    // Determine dominant emotion
    let emotion: Emotion = 'neutral';
    let confidence = 0.5;
    
    if (excitedCount > 0) {
      emotion = 'excited';
      confidence = Math.min(0.9, 0.6 + (excitedCount / words.length) * 2);
    } else if (positiveCount > negativeCount) {
      emotion = 'happy';
      confidence = Math.min(0.9, 0.6 + (positiveCount / words.length) * 2);
    } else if (negativeCount > positiveCount) {
      if (words.some(w => ['angry', 'furious', 'mad'].includes(w))) {
        emotion = 'angry';
      } else {
        emotion = 'sad';
      }
      confidence = Math.min(0.9, 0.6 + (negativeCount / words.length) * 2);
    }
    
    const sentimentScore = (positiveCount - negativeCount) / Math.max(words.length, 1);
    
    return {
      emotion,
      confidence,
      sentimentScore
    };
  } catch (error) {
    console.error('Emotion analysis error:', error);
    return {
      emotion: 'neutral',
      confidence: 0.5,
      sentimentScore: 0
    };
  }
}

export function selectAssetsForEmotion(emotion: Emotion): AssetRecommendation {
  // Map emotions to appropriate video assets and styling
  const assetMap: Record<Emotion, AssetRecommendation> = {
    happy: {
      musicTracks: ['upbeat_acoustic.mp3', 'positive_corporate.mp3', 'cheerful_piano.mp3'],
      transitions: ['fade_bright.mp4', 'slide_smooth.mp4', 'zoom_happy.mp4'],
      colorSchemes: ['warm_yellow', 'bright_orange', 'cheerful_blue'],
      pacing: 'medium'
    },
    excited: {
      musicTracks: ['energetic_electronic.mp3', 'upbeat_rock.mp3', 'dynamic_synth.mp3'],
      transitions: ['quick_cut.mp4', 'dynamic_zoom.mp4', 'pulse_effect.mp4'],
      colorSchemes: ['vibrant_red', 'electric_blue', 'neon_green'],
      pacing: 'fast'
    },
    sad: {
      musicTracks: ['melancholic_piano.mp3', 'soft_strings.mp3', 'gentle_ambient.mp3'],
      transitions: ['slow_fade.mp4', 'gentle_dissolve.mp4', 'soft_wipe.mp4'],
      colorSchemes: ['muted_blue', 'soft_gray', 'gentle_purple'],
      pacing: 'slow'
    },
    angry: {
      musicTracks: ['intense_drums.mp3', 'aggressive_rock.mp3', 'dark_electronic.mp3'],
      transitions: ['sharp_cut.mp4', 'dramatic_zoom.mp4', 'impact_effect.mp4'],
      colorSchemes: ['deep_red', 'dark_orange', 'intense_black'],
      pacing: 'fast'
    },
    neutral: {
      musicTracks: ['corporate_background.mp3', 'neutral_ambient.mp3', 'simple_piano.mp3'],
      transitions: ['standard_fade.mp4', 'clean_cut.mp4', 'basic_slide.mp4'],
      colorSchemes: ['neutral_gray', 'classic_blue', 'clean_white'],
      pacing: 'medium'
    }
  };
  
  return assetMap[emotion];
}

export async function generateEmotionAwareScript(originalScript: string, targetEmotion: Emotion): Promise<string> {
  // This would integrate with OpenAI to rewrite the script to match the target emotion
  // For now, return the original with emotional cues
  const emotionCues: Record<Emotion, string[]> = {
    happy: ['with enthusiasm', 'cheerfully', 'with a smile', 'positively'],
    excited: ['with energy', 'dynamically', 'with passion', 'enthusiastically'],
    sad: ['gently', 'softly', 'with care', 'thoughtfully'],
    angry: ['with intensity', 'forcefully', 'with conviction', 'boldly'],
    neutral: ['clearly', 'professionally', 'straightforwardly', 'calmly']
  };
  
  const cues = emotionCues[targetEmotion];
  const randomCue = cues[Math.floor(Math.random() * cues.length)];
  
  return `${originalScript} (delivered ${randomCue})`;
}
