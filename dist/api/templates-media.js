import { searchTemplates, searchMediaAssets, getTemplateById, getMediaAssetById, generateTemplateFromPrompt, uploadMediaAsset, getPopularTemplates, getRecentTemplates, getRecommendedTemplates } from '../features/templates-media-ai';
import { verifyJWT } from '../lib/auth';
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        // Verify JWT authentication
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }
        const token = authHeader.substring(7);
        const decoded = await verifyJWT(token);
        if (!decoded) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        const { action, ...params } = req.body;
        switch (action) {
            case 'search_templates':
                return await handleSearchTemplates(req, res, decoded);
            case 'search_media':
                return await handleSearchMedia(req, res, decoded);
            case 'get_template':
                return await handleGetTemplate(req, res, decoded);
            case 'get_media':
                return await handleGetMedia(req, res, decoded);
            case 'generate_template':
                return await handleGenerateTemplate(req, res, decoded);
            case 'upload_media':
                return await handleUploadMedia(req, res, decoded);
            case 'popular_templates':
                return await handlePopularTemplates(req, res, decoded);
            case 'recent_templates':
                return await handleRecentTemplates(req, res, decoded);
            case 'recommended_templates':
                return await handleRecommendedTemplates(req, res, decoded);
            default:
                return res.status(400).json({ error: 'Invalid action specified' });
        }
    }
    catch (error) {
        console.error('Templates & Media API error:', error);
        if (error instanceof Error) {
            return res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
}
async function handleSearchTemplates(req, res, decoded) {
    const filters = req.body.filters || {};
    try {
        const result = await searchTemplates(filters);
        res.status(200).json({
            success: true,
            data: result,
            message: 'Templates search completed successfully'
        });
    }
    catch (error) {
        console.error('Template search error:', error);
        res.status(500).json({ error: 'Failed to search templates' });
    }
}
async function handleSearchMedia(req, res, decoded) {
    const filters = req.body.filters || {};
    try {
        const result = await searchMediaAssets(filters);
        res.status(200).json({
            success: true,
            data: result,
            message: 'Media search completed successfully'
        });
    }
    catch (error) {
        console.error('Media search error:', error);
        res.status(500).json({ error: 'Failed to search media assets' });
    }
}
async function handleGetTemplate(req, res, decoded) {
    const { templateId } = req.body;
    if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' });
    }
    try {
        const template = await getTemplateById(templateId);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        res.status(200).json({
            success: true,
            data: template,
            message: 'Template retrieved successfully'
        });
    }
    catch (error) {
        console.error('Template fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
}
async function handleGetMedia(req, res, decoded) {
    const { assetId } = req.body;
    if (!assetId) {
        return res.status(400).json({ error: 'Asset ID is required' });
    }
    try {
        const asset = await getMediaAssetById(assetId);
        if (!asset) {
            return res.status(404).json({ error: 'Media asset not found' });
        }
        res.status(200).json({
            success: true,
            data: asset,
            message: 'Media asset retrieved successfully'
        });
    }
    catch (error) {
        console.error('Media asset fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch media asset' });
    }
}
async function handleGenerateTemplate(req, res, decoded) {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }
    try {
        const template = await generateTemplateFromPrompt(prompt, decoded.userId);
        res.status(200).json({
            success: true,
            data: template,
            message: 'Template generated successfully'
        });
    }
    catch (error) {
        console.error('Template generation error:', error);
        res.status(500).json({ error: 'Failed to generate template' });
    }
}
async function handleUploadMedia(req, res, decoded) {
    const { file, metadata = {} } = req.body;
    if (!file) {
        return res.status(400).json({ error: 'File is required' });
    }
    try {
        // In production, this would handle actual file upload
        // For now, we'll simulate the upload process
        const asset = await uploadMediaAsset(file, metadata, decoded.userId);
        res.status(200).json({
            success: true,
            data: asset,
            message: 'Media asset uploaded successfully'
        });
    }
    catch (error) {
        console.error('Media upload error:', error);
        res.status(500).json({ error: 'Failed to upload media asset' });
    }
}
async function handlePopularTemplates(req, res, decoded) {
    const { limit = 10 } = req.body;
    try {
        const templates = await getPopularTemplates(limit);
        res.status(200).json({
            success: true,
            data: templates,
            message: 'Popular templates retrieved successfully'
        });
    }
    catch (error) {
        console.error('Popular templates error:', error);
        res.status(500).json({ error: 'Failed to fetch popular templates' });
    }
}
async function handleRecentTemplates(req, res, decoded) {
    const { limit = 10 } = req.body;
    try {
        const templates = await getRecentTemplates(limit);
        res.status(200).json({
            success: true,
            data: templates,
            message: 'Recent templates retrieved successfully'
        });
    }
    catch (error) {
        console.error('Recent templates error:', error);
        res.status(500).json({ error: 'Failed to fetch recent templates' });
    }
}
async function handleRecommendedTemplates(req, res, decoded) {
    const { limit = 10 } = req.body;
    try {
        const templates = await getRecommendedTemplates(decoded.userId, limit);
        res.status(200).json({
            success: true,
            data: templates,
            message: 'Recommended templates retrieved successfully'
        });
    }
    catch (error) {
        console.error('Recommended templates error:', error);
        res.status(500).json({ error: 'Failed to fetch recommended templates' });
    }
}
