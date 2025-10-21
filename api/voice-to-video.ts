// Enterprise-grade Voice-to-Video Generation API
import { NextApiRequest, NextApiResponse } from 'next';
import { processVoiceToVideo, validateAudioFormat, VoiceToVideoOptions } from '../features/voice-to-video-ai';
// import { verifyJWT } from '../lib/auth'; // Disabled for development

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Voice-to-video API called:', req.method, req.body?.development ? 'development' : 'production');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Development mode: Skip authentication
    console.log('[API] Development mode: Skipping authentication for voice-to-video');

    // Validate request body
    const { audio, options = {} } = req.body;
    
    if (!audio) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    // Convert base64 audio to buffer if needed
    let audioBuffer: Buffer;
    if (typeof audio === 'string') {
      audioBuffer = Buffer.from(audio, 'base64');
    } else {
      audioBuffer = Buffer.from(audio);
    }

    // Validate audio format
    // Convert Buffer to File-like object for validation
    const audioFile = new File([new Uint8Array(audioBuffer)], 'audio.mp3', { type: 'audio/mpeg' });
    if (!validateAudioFormat(audioFile)) {
      return res.status(400).json({ 
        error: 'Unsupported audio format. Please use WAV, MP3, OGG, or WEBM.' 
      });
    }

    // Validate options
    const voiceOptions: VoiceToVideoOptions = {
      voiceId: options.voiceId || 'default-voice',
      language: options.language || 'en',
      style: options.style || 'professional',
      duration: Math.min(Math.max(options.duration || 30, 10), 300), // 10-300 seconds
    };

    // Process voice-to-video conversion
    const result = await processVoiceToVideo(audioFile, voiceOptions);

    // Log usage for analytics
    console.log('Voice-to-video processed in development mode:', {
      videoUrl: result.videoUrl,
      transcript: result.transcript,
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Voice-to-video conversion completed successfully'
    });

  } catch (error) {
    console.error('Voice-to-video API error:', error);
    
    if (error instanceof Error) {
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}
