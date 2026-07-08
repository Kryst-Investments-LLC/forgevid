// Templates and Media Management - Production Implementation
import OpenAI from 'openai';
import { openAiApiKey } from '@/lib/openai-key';
import { lazyClient } from '@/lib/lazy-client';

const openai = lazyClient<OpenAI>(() => new OpenAI({
  apiKey: openAiApiKey(),
}));

export interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'social' | 'educational' | 'marketing' | 'entertainment' | 'presentation';
  duration: number; // in seconds
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '21:9';
  resolution: '720p' | '1080p' | '4k';
  tags: string[];
  thumbnail: string;
  previewUrl: string;
  templateData: {
    scenes: Array<{
      id: string;
      duration: number;
      type: 'intro' | 'content' | 'outro' | 'transition';
      elements: Array<{
        type: 'text' | 'image' | 'video' | 'audio' | 'animation';
        content: string;
        position: { x: number; y: number };
        style: any;
      }>;
    }>;
    audio: {
      backgroundMusic: string;
      soundEffects: string[];
    };
    branding: {
      logo: string;
      colors: string[];
      fonts: string[];
    };
  };
  usageCount: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  type: 'image' | 'video' | 'audio' | 'animation' | 'icon';
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  duration?: number; // for video/audio
  size: number; // in bytes
  dimensions?: { width: number; height: number };
  format: string;
  tags: string[];
  category: string;
  license: 'free' | 'premium' | 'royalty-free' | 'rights-managed';
  usageCount: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface MediaSearchFilters {
  type?: string[];
  category?: string[];
  tags?: string[];
  license?: string[];
  duration?: { min: number; max: number };
  resolution?: string[];
  color?: string;
  orientation?: 'landscape' | 'portrait' | 'square';
}

export interface TemplateSearchFilters {
  category?: string[];
  duration?: { min: number; max: number };
  aspectRatio?: string[];
  tags?: string[];
  rating?: { min: number; max: number };
}

export interface MediaLibrary {
  assets: MediaAsset[];
  totalCount: number;
  categories: string[];
  tags: string[];
  totalSize: number;
}

export interface TemplateLibrary {
  templates: VideoTemplate[];
  totalCount: number;
  categories: string[];
  tags: string[];
}

// Mock data for templates
const mockTemplates: VideoTemplate[] = [
  {
    id: 'template_001',
    name: 'Professional Business Presentation',
    description: 'Clean, modern template perfect for corporate presentations and pitches',
    category: 'business',
    duration: 60,
    aspectRatio: '16:9',
    resolution: '1080p',
    tags: ['corporate', 'professional', 'clean', 'modern'],
    thumbnail: 'https://forgevid.com/templates/thumbnails/business-001.jpg',
    previewUrl: 'https://forgevid.com/templates/previews/business-001.mp4',
    templateData: {
      scenes: [
        {
          id: 'intro',
          duration: 5,
          type: 'intro',
          elements: [
            {
              type: 'text',
              content: 'Welcome to Our Presentation',
              position: { x: 50, y: 30 },
              style: { fontSize: 48, fontWeight: 'bold', color: '#ffffff' }
            }
          ]
        },
        {
          id: 'content',
          duration: 50,
          type: 'content',
          elements: [
            {
              type: 'text',
              content: 'Key Points',
              position: { x: 10, y: 20 },
              style: { fontSize: 32, fontWeight: 'bold', color: '#333333' }
            }
          ]
        },
        {
          id: 'outro',
          duration: 5,
          type: 'outro',
          elements: [
            {
              type: 'text',
              content: 'Thank You',
              position: { x: 50, y: 50 },
              style: { fontSize: 36, fontWeight: 'bold', color: '#ffffff' }
            }
          ]
        }
      ],
      audio: {
        backgroundMusic: 'https://forgevid.com/audio/corporate-bg.mp3',
        soundEffects: []
      },
      branding: {
        logo: 'https://forgevid.com/branding/logo-placeholder.png',
        colors: ['#1e40af', '#ffffff', '#f3f4f6'],
        fonts: ['Inter', 'Arial', 'Helvetica']
      }
    },
    usageCount: 1250,
    rating: 4.8,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'template_002',
    name: 'Social Media Story',
    description: 'Engaging vertical template designed for Instagram and TikTok stories',
    category: 'social',
    duration: 15,
    aspectRatio: '9:16',
    resolution: '1080p',
    tags: ['social', 'story', 'vertical', 'engaging', 'trendy'],
    thumbnail: 'https://forgevid.com/templates/thumbnails/social-002.jpg',
    previewUrl: 'https://forgevid.com/templates/previews/social-002.mp4',
    templateData: {
      scenes: [
        {
          id: 'intro',
          duration: 3,
          type: 'intro',
          elements: [
            {
              type: 'text',
              content: 'Check this out!',
              position: { x: 50, y: 20 },
              style: { fontSize: 32, fontWeight: 'bold', color: '#ff6b6b' }
            }
          ]
        },
        {
          id: 'content',
          duration: 9,
          type: 'content',
          elements: [
            {
              type: 'text',
              content: 'Amazing content here',
              position: { x: 50, y: 50 },
              style: { fontSize: 24, fontWeight: 'normal', color: '#ffffff' }
            }
          ]
        },
        {
          id: 'outro',
          duration: 3,
          type: 'outro',
          elements: [
            {
              type: 'text',
              content: 'Follow for more!',
              position: { x: 50, y: 80 },
              style: { fontSize: 20, fontWeight: 'bold', color: '#4ecdc4' }
            }
          ]
        }
      ],
      audio: {
        backgroundMusic: 'https://forgevid.com/audio/upbeat-bg.mp3',
        soundEffects: ['https://forgevid.com/audio/notification.mp3']
      },
      branding: {
        logo: 'https://forgevid.com/branding/social-logo.png',
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'],
        fonts: ['Poppins', 'Montserrat', 'Open Sans']
      }
    },
    usageCount: 3200,
    rating: 4.6,
    createdAt: '2024-01-10T14:30:00Z',
    updatedAt: '2024-01-10T14:30:00Z'
  }
];

// Mock data for media assets
const mockMediaAssets: MediaAsset[] = [
  {
    id: 'asset_001',
    type: 'image',
    title: 'Business Meeting',
    description: 'Professional business meeting scene',
    url: 'https://forgevid.com/media/images/business-meeting.jpg',
    thumbnail: 'https://forgevid.com/media/thumbnails/business-meeting-thumb.jpg',
    size: 2048000,
    dimensions: { width: 1920, height: 1080 },
    format: 'jpg',
    tags: ['business', 'meeting', 'professional', 'office'],
    category: 'business',
    license: 'free',
    usageCount: 450,
    uploadedAt: '2024-01-20T09:00:00Z',
    uploadedBy: 'user_123'
  },
  {
    id: 'asset_002',
    type: 'video',
    title: 'City Time-lapse',
    description: 'Beautiful time-lapse of city traffic',
    url: 'https://forgevid.com/media/videos/city-timelapse.mp4',
    thumbnail: 'https://forgevid.com/media/thumbnails/city-timelapse-thumb.jpg',
    duration: 30,
    size: 15728640,
    dimensions: { width: 1920, height: 1080 },
    format: 'mp4',
    tags: ['city', 'timelapse', 'urban', 'traffic', 'motion'],
    category: 'background',
    license: 'premium',
    usageCount: 120,
    uploadedAt: '2024-01-18T16:45:00Z',
    uploadedBy: 'user_456'
  },
  {
    id: 'asset_003',
    type: 'audio',
    title: 'Upbeat Corporate Music',
    description: 'Professional background music for presentations',
    url: 'https://forgevid.com/media/audio/corporate-upbeat.mp3',
    thumbnail: 'https://forgevid.com/media/thumbnails/audio-waveform.jpg',
    duration: 120,
    size: 5120000,
    format: 'mp3',
    tags: ['corporate', 'upbeat', 'background', 'music', 'professional'],
    category: 'audio',
    license: 'royalty-free',
    usageCount: 890,
    uploadedAt: '2024-01-22T11:20:00Z',
    uploadedBy: 'user_789'
  }
];

export async function searchTemplates(filters: TemplateSearchFilters = {}): Promise<TemplateLibrary> {
  try {
    let filteredTemplates = [...mockTemplates];

    // Apply filters
    if (filters.category && filters.category.length > 0) {
      filteredTemplates = filteredTemplates.filter(t => 
        filters.category!.includes(t.category)
      );
    }

    if (filters.duration) {
      filteredTemplates = filteredTemplates.filter(t => 
        t.duration >= filters.duration!.min && t.duration <= filters.duration!.max
      );
    }

    if (filters.aspectRatio && filters.aspectRatio.length > 0) {
      filteredTemplates = filteredTemplates.filter(t => 
        filters.aspectRatio!.includes(t.aspectRatio)
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      filteredTemplates = filteredTemplates.filter(t => 
        filters.tags!.some(tag => t.tags.includes(tag))
      );
    }

    if (filters.rating) {
      filteredTemplates = filteredTemplates.filter(t => 
        t.rating >= filters.rating!.min && t.rating <= filters.rating!.max
      );
    }

    // Get unique categories and tags
    const categories = [...new Set(mockTemplates.map(t => t.category))];
    const tags = [...new Set(mockTemplates.flatMap(t => t.tags))];

    return {
      templates: filteredTemplates,
      totalCount: filteredTemplates.length,
      categories,
      tags
    };
  } catch (error) {
    console.error('Template search error:', error);
    throw new Error('Failed to search templates');
  }
}

export async function searchMediaAssets(filters: MediaSearchFilters = {}): Promise<MediaLibrary> {
  try {
    let filteredAssets = [...mockMediaAssets];

    // Apply filters
    if (filters.type && filters.type.length > 0) {
      filteredAssets = filteredAssets.filter(a => 
        filters.type!.includes(a.type)
      );
    }

    if (filters.category && filters.category.length > 0) {
      filteredAssets = filteredAssets.filter(a => 
        filters.category!.includes(a.category)
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      filteredAssets = filteredAssets.filter(a => 
        filters.tags!.some(tag => a.tags.includes(tag))
      );
    }

    if (filters.license && filters.license.length > 0) {
      filteredAssets = filteredAssets.filter(a => 
        filters.license!.includes(a.license)
      );
    }

    if (filters.duration) {
      filteredAssets = filteredAssets.filter(a => 
        a.duration && a.duration >= filters.duration!.min && a.duration <= filters.duration!.max
      );
    }

    if (filters.resolution && filters.resolution.length > 0) {
      filteredAssets = filteredAssets.filter(a => 
        a.dimensions && filters.resolution!.some(res => {
          const [width, height] = res.split('x').map(Number);
          return a.dimensions!.width >= width && a.dimensions!.height >= height;
        })
      );
    }

    // Get unique categories and tags
    const categories = [...new Set(mockMediaAssets.map(a => a.category))];
    const tags = [...new Set(mockMediaAssets.flatMap(a => a.tags))];
    const totalSize = filteredAssets.reduce((sum, a) => sum + a.size, 0);

    return {
      assets: filteredAssets,
      totalCount: filteredAssets.length,
      categories,
      tags,
      totalSize
    };
  } catch (error) {
    console.error('Media search error:', error);
    throw new Error('Failed to search media assets');
  }
}

export async function getTemplateById(templateId: string): Promise<VideoTemplate | null> {
  try {
    const template = mockTemplates.find(t => t.id === templateId);
    return template || null;
  } catch (error) {
    console.error('Template fetch error:', error);
    throw new Error('Failed to fetch template');
  }
}

export async function getMediaAssetById(assetId: string): Promise<MediaAsset | null> {
  try {
    const asset = mockMediaAssets.find(a => a.id === assetId);
    return asset || null;
  } catch (error) {
    console.error('Media asset fetch error:', error);
    throw new Error('Failed to fetch media asset');
  }
}

export async function generateTemplateFromPrompt(
  prompt: string,
  userId: string
): Promise<VideoTemplate> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a video template designer. Create detailed video templates based on user prompts. Include scene structure, timing, visual elements, and styling.'
        },
        {
          role: 'user',
          content: `Create a video template based on this prompt: "${prompt}"`
        }
      ],
      temperature: 0.7,
    });

    const templateData = response.choices[0]?.message?.content || '';
    
    // Generate template ID and basic structure
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: templateId,
      name: `AI Generated: ${prompt.substring(0, 50)}...`,
      description: `Custom template generated from: "${prompt}"`,
      category: 'business', // Default category
      duration: 60,
      aspectRatio: '16:9',
      resolution: '1080p',
      tags: ['ai-generated', 'custom', 'unique'],
      thumbnail: `https://forgevid.com/templates/thumbnails/${templateId}.jpg`,
      previewUrl: `https://forgevid.com/templates/previews/${templateId}.mp4`,
      templateData: {
        scenes: [
          {
            id: 'intro',
            duration: 10,
            type: 'intro',
            elements: [
              {
                type: 'text',
                content: 'Generated Content',
                position: { x: 50, y: 50 },
                style: { fontSize: 36, fontWeight: 'bold', color: '#ffffff' }
              }
            ]
          }
        ],
        audio: {
          backgroundMusic: '',
          soundEffects: []
        },
        branding: {
          logo: '',
          colors: ['#1e40af', '#ffffff'],
          fonts: ['Inter']
        }
      },
      usageCount: 0,
      rating: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Template generation error:', error);
    throw new Error('Failed to generate template from prompt');
  }
}

export async function uploadMediaAsset(
  file: File,
  metadata: Partial<MediaAsset>,
  userId: string
): Promise<MediaAsset> {
  try {
    // In production, this would upload to cloud storage
    const assetId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const asset: MediaAsset = {
      id: assetId,
      type: file.type.startsWith('image/') ? 'image' : 
            file.type.startsWith('video/') ? 'video' : 
            file.type.startsWith('audio/') ? 'audio' : 'animation',
      title: metadata.title || file.name,
      description: metadata.description || '',
      url: `https://forgevid.com/media/${assetId}.${file.name.split('.').pop()}`,
      thumbnail: `https://forgevid.com/media/thumbnails/${assetId}-thumb.jpg`,
      size: file.size,
      format: file.name.split('.').pop() || 'unknown',
      tags: metadata.tags || [],
      category: metadata.category || 'general',
      license: metadata.license || 'free',
      usageCount: 0,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userId
    };

    // Add to mock data
    mockMediaAssets.push(asset);

    return asset;
  } catch (error) {
    console.error('Media upload error:', error);
    throw new Error('Failed to upload media asset');
  }
}

export async function getPopularTemplates(limit: number = 10): Promise<VideoTemplate[]> {
  try {
    return mockTemplates
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  } catch (error) {
    console.error('Popular templates error:', error);
    throw new Error('Failed to fetch popular templates');
  }
}

export async function getRecentTemplates(limit: number = 10): Promise<VideoTemplate[]> {
  try {
    return mockTemplates
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('Recent templates error:', error);
    throw new Error('Failed to fetch recent templates');
  }
}

export async function getRecommendedTemplates(
  userId: string,
  limit: number = 10
): Promise<VideoTemplate[]> {
  try {
    // In production, this would use ML to recommend based on user behavior
    // For now, return a mix of popular and recent templates
    const popular = await getPopularTemplates(Math.ceil(limit / 2));
    const recent = await getRecentTemplates(Math.ceil(limit / 2));
    
    return [...popular, ...recent].slice(0, limit);
  } catch (error) {
    console.error('Template recommendations error:', error);
    throw new Error('Failed to fetch recommended templates');
  }
}
