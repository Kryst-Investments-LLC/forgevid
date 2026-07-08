/**
 * Real Video Generation via Replicate API
 *
 * Supports multiple models:
 * - Stable Video Diffusion (image-to-video)
 * - Zeroscope (text-to-video)
 * - Deforum (text-to-video with style)
 *
 * Falls back gracefully when API key is not configured.
 */

export interface VideoGenerationRequest {
  prompt: string;
  style: 'modern' | 'cinematic' | 'energetic' | 'professional';
  duration: number;
  width?: number;
  height?: number;
}

export interface VideoGenerationResult {
  videoUrl: string;
  provider: 'replicate' | 'fallback';
  model: string;
  processingTime: number;
  cost: number;
}

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || '';
const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';

// Model configuration
const MODELS = {
  // Zeroscope v2 XL — best open text-to-video model
  zeroscope: 'anotherjesse/zeroscope-v2-xl:9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351',
  // Stable Video Diffusion for image-to-video
  svd: 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438',
};

// Style-to-prompt modifiers
const STYLE_MODIFIERS: Record<string, string> = {
  modern: 'clean minimal design, smooth motion, contemporary aesthetic, soft lighting',
  cinematic: 'cinematic, dramatic lighting, shallow depth of field, film grain, anamorphic lens',
  energetic: 'dynamic motion, vibrant colors, fast paced, high energy, bold graphics',
  professional: 'corporate, polished, formal, clean typography, trustworthy, business-like',
};

async function callReplicateAPI(modelVersion: string, input: Record<string, unknown>): Promise<string | null> {
  if (!REPLICATE_API_TOKEN) {
    console.log('[Replicate] No API token configured, skipping');
    return null;
  }

  try {
    // Create prediction
    const createResponse = await fetch(REPLICATE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        version: modelVersion.split(':')[1],
        input,
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('[Replicate] Create prediction failed:', error);
      return null;
    }

    let prediction = await createResponse.json();

    // Poll for completion if not using Prefer: wait
    const maxAttempts = 120; // 10 minutes max
    let attempts = 0;

    while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;

      const pollResponse = await fetch(`${REPLICATE_API_URL}/${prediction.id}`, {
        headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
      });

      if (!pollResponse.ok) {
        console.error('[Replicate] Poll failed');
        return null;
      }

      prediction = await pollResponse.json();
      console.log(`[Replicate] Status: ${prediction.status} (attempt ${attempts})`);
    }

    if (prediction.status === 'succeeded') {
      // Output is typically an array of URLs or a single URL
      const output = prediction.output;
      if (Array.isArray(output)) {
        return output[0] || null;
      }
      return typeof output === 'string' ? output : null;
    }

    console.error('[Replicate] Prediction failed:', prediction.error);
    return null;
  } catch (error) {
    console.error('[Replicate] API error:', error);
    return null;
  }
}

export async function generateVideoWithReplicate(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
  const startTime = Date.now();
  const styleModifier = STYLE_MODIFIERS[request.style] || STYLE_MODIFIERS.modern;
  const enhancedPrompt = `${request.prompt}, ${styleModifier}, high quality, detailed`;

  console.log(`[VideoGen] Generating video: "${enhancedPrompt.substring(0, 100)}..."`);

  // Try Zeroscope (text-to-video)
  const videoUrl = await callReplicateAPI(MODELS.zeroscope, {
    prompt: enhancedPrompt,
    num_frames: Math.min(Math.max(Math.round(request.duration * 8), 24), 200), // 8fps, clamped
    width: request.width || 1024,
    height: request.height || 576,
    num_inference_steps: 50,
    guidance_scale: 17.5,
    negative_prompt: 'low quality, blurry, distorted, watermark, text overlay, ugly, bad anatomy',
  });

  if (videoUrl) {
    return {
      videoUrl,
      provider: 'replicate',
      model: 'zeroscope-v2-xl',
      processingTime: Date.now() - startTime,
      cost: 0.07, // Approximate per-run cost
    };
  }

  // Fallback to existing stock footage pipeline
  console.log('[VideoGen] Replicate unavailable, falling back to stock footage pipeline');
  const { generateVideoFromPrompt } = await import('@/lib/video-generator');

  const fallbackUrl = await generateVideoFromPrompt({
    prompt: request.prompt,
    style: request.style,
    duration: request.duration,
    addOns: [],
  });

  return {
    videoUrl: fallbackUrl,
    provider: 'fallback',
    model: 'stock-footage',
    processingTime: Date.now() - startTime,
    cost: 0,
  };
}

/**
 * Generate video from image (image-to-video via SVD)
 */
export async function generateVideoFromImage(imageUrl: string, options?: {
  motionBucketId?: number;
  fps?: number;
}): Promise<VideoGenerationResult> {
  const startTime = Date.now();

  const videoUrl = await callReplicateAPI(MODELS.svd, {
    input_image: imageUrl,
    motion_bucket_id: options?.motionBucketId || 127,
    fps: options?.fps || 7,
    cond_aug: 0.02,
  });

  if (videoUrl) {
    return {
      videoUrl,
      provider: 'replicate',
      model: 'stable-video-diffusion',
      processingTime: Date.now() - startTime,
      cost: 0.10,
    };
  }

  // Fail visibly — never hand the caller an unrelated sample video.
  throw new Error('Image-to-video generation failed (Replicate unavailable or not configured)');
}
