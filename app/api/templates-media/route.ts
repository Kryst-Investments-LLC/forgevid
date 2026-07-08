// Next.js 13+ Route Handler for /api/templates-media
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  searchTemplates,
  searchMediaAssets,
  getTemplateById,
  getMediaAssetById,
  generateTemplateFromPrompt,
  uploadMediaAsset,
  getPopularTemplates,
  getRecentTemplates,
  getRecommendedTemplates,
  TemplateSearchFilters,
  MediaSearchFilters
} from '../../../features/templates-media-ai';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case 'search_templates':
        return await handleSearchTemplates(body);
      case 'search_media':
        return await handleSearchMedia(body);
      case 'get_template':
        return await handleGetTemplate(body);
      case 'get_media':
        return await handleGetMedia(body);
      case 'generate_template':
        if (!process.env.OPENAI_SECRET_KEY) {
          return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
        }
        return await handleGenerateTemplate(body);
      case 'upload_media':
        return await handleUploadMedia(body);
      case 'get_popular_templates':
        return await handlePopularTemplates(body);
      case 'get_recent_templates':
        return await handleRecentTemplates(body);
      case 'get_recommended_templates':
        return await handleRecommendedTemplates(body);
      default:
        return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Templates & Media API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleSearchTemplates(body: any) {
  const filters: TemplateSearchFilters = body.filters || {};
  try {
    const result = await searchTemplates(filters);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Template search error:', error);
    return NextResponse.json({ error: 'Failed to search templates' }, { status: 500 });
  }
}

async function handleSearchMedia(body: any) {
  const filters: MediaSearchFilters = body.filters || {};
  try {
    const result = await searchMediaAssets(filters);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Media search error:', error);
    return NextResponse.json({ error: 'Failed to search media assets' }, { status: 500 });
  }
}

async function handleGetTemplate(body: any) {
  const { templateId } = body;
  if (!templateId) {
    return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
  }
  try {
    const template = await getTemplateById(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error('Template fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

async function handleGetMedia(body: any) {
  const { assetId } = body;
  if (!assetId) {
    return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
  }
  try {
    const asset = await getMediaAssetById(assetId);
    if (!asset) {
      return NextResponse.json({ error: 'Media asset not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: asset });
  } catch (error) {
    console.error('Media asset fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch media asset' }, { status: 500 });
  }
}

async function handleGenerateTemplate(body: any) {
  const { prompt } = body;
  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }
  try {
    const template = await generateTemplateFromPrompt('dev-user');
    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}

async function handleUploadMedia(body: any) {
  const { file, metadata = {} } = body;
  if (!file) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 });
  }
  try {
    const asset = await uploadMediaAsset(file, 'dev-user');
    return NextResponse.json({ success: true, data: asset });
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json({ error: 'Failed to upload media asset' }, { status: 500 });
  }
}

async function handlePopularTemplates(body: any) {
  const { limit = 10 } = body;
  try {
    const templates = await getPopularTemplates(Math.min(limit, 50));
    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error('Popular templates error:', error);
    return NextResponse.json({ error: 'Failed to fetch popular templates' }, { status: 500 });
  }
}

async function handleRecentTemplates(body: any) {
  const { limit = 10 } = body;
  try {
    const templates = await getRecentTemplates(Math.min(limit, 50));
    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error('Recent templates error:', error);
    return NextResponse.json({ error: 'Failed to fetch recent templates' }, { status: 500 });
  }
}

async function handleRecommendedTemplates(body: any) {
  const { limit = 10 } = body;
  try {
    const templates = await getRecommendedTemplates('dev-user', Math.min(limit, 50));
    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error('Recommended templates error:', error);
    return NextResponse.json({ error: 'Failed to fetch recommended templates' }, { status: 500 });
  }
}
