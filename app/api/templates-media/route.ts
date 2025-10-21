// Next.js 13+ Route Handler for /api/templates-media
import { NextRequest, NextResponse } from 'next/server';
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
// import { verifyJWT } from '../../../lib/auth'; // Disabled for development

export async function POST(req: NextRequest) {
  try {
    // Development mode: Skip authentication
    console.log('[API] Development mode: Skipping authentication for templates-media');
    const body = await req.json();
    const { action, ...params } = body;
    console.log('[API] Action:', action, 'Body:', body);
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
          console.error('[API] Missing OPENAI_SECRET_KEY in environment');
          return NextResponse.json({ error: 'OpenAI API key missing on server', debug: { env: process.env.OPENAI_SECRET_KEY } }, { status: 500 });
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
        console.error('[API] Invalid action specified:', action);
        return NextResponse.json({ error: 'Invalid action specified', debug: { action } }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Templates & Media API error:', error, 'Stack:', error?.stack);
    return NextResponse.json({ error: 'Internal server error', message: error?.message, stack: error?.stack }, { status: 500 });
  }
}

async function handleSearchTemplates(body: any) {
  const filters: TemplateSearchFilters = body.filters || {};
  try {
    const result = await searchTemplates(filters);
    return NextResponse.json({ success: true, data: result, message: 'Templates search completed successfully' });
  } catch (error) {
    console.error('Template search error:', error);
    return NextResponse.json({ error: 'Failed to search templates', details: String(error) }, { status: 500 });
  }
}

async function handleSearchMedia(body: any) {
  const filters: MediaSearchFilters = body.filters || {};
  try {
    const result = await searchMediaAssets(filters);
    return NextResponse.json({ success: true, data: result, message: 'Media search completed successfully' });
  } catch (error) {
    console.error('Media search error:', error);
    return NextResponse.json({ error: 'Failed to search media assets', details: String(error) }, { status: 500 });
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
      console.error('Template not found:', templateId);
      return NextResponse.json({ error: 'Template not found', templateId }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: template, message: 'Template retrieved successfully' });
  } catch (error) {
    console.error('Template fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch template', details: String(error) }, { status: 500 });
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
      console.error('Media asset not found:', assetId);
      return NextResponse.json({ error: 'Media asset not found', assetId }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: asset, message: 'Media asset retrieved successfully' });
  } catch (error) {
    console.error('Media asset fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch media asset', details: String(error) }, { status: 500 });
  }
}

async function handleGenerateTemplate(body: any) {
  const { prompt } = body;
  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }
  try {
    const template = await generateTemplateFromPrompt('dev-user');
    return NextResponse.json({ success: true, data: template, message: 'Template generated successfully' });
  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json({ error: 'Failed to generate template', details: String(error) }, { status: 500 });
  }
}

async function handleUploadMedia(body: any) {
  const { file, metadata = {} } = body;
  if (!file) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 });
  }
  try {
    const asset = await uploadMediaAsset(file, 'dev-user');
    return NextResponse.json({ success: true, data: asset, message: 'Media asset uploaded successfully' });
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json({ error: 'Failed to upload media asset', details: String(error) }, { status: 500 });
  }
}

async function handlePopularTemplates(body: any) {
  const { limit = 10 } = body;
  try {
    const templates = await getPopularTemplates(limit);
    return NextResponse.json({ success: true, data: templates, message: 'Popular templates retrieved successfully' });
  } catch (error) {
    console.error('Popular templates error:', error);
    return NextResponse.json({ error: 'Failed to fetch popular templates', details: String(error) }, { status: 500 });
  }
}

async function handleRecentTemplates(body: any) {
  const { limit = 10 } = body;
  try {
    const templates = await getRecentTemplates(limit);
    return NextResponse.json({ success: true, data: templates, message: 'Recent templates retrieved successfully' });
  } catch (error) {
    console.error('Recent templates error:', error);
    return NextResponse.json({ error: 'Failed to fetch recent templates', details: String(error) }, { status: 500 });
  }
}

async function handleRecommendedTemplates(body: any) {
  const { limit = 10 } = body;
  try {
    const templates = await getRecommendedTemplates('dev-user', limit);
    return NextResponse.json({ success: true, data: templates, message: 'Recommended templates retrieved successfully' });
  } catch (error) {
    console.error('Recommended templates error:', error);
    return NextResponse.json({ error: 'Failed to fetch recommended templates', details: String(error) }, { status: 500 });
  }
}
