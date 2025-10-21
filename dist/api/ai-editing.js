import { applyVideoEdit, generateAutoEditSuggestions, analyzeVideo, batchEditVideos, createVideoThumbnail } from '../features/ai-editing-ai';
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
            case 'analyze':
                return await handleAnalyzeVideo(req, res, decoded);
            case 'suggest':
                return await handleGenerateSuggestions(req, res, decoded);
            case 'edit':
                return await handleApplyEdit(req, res, decoded);
            case 'batch_edit':
                return await handleBatchEdit(req, res, decoded);
            case 'thumbnail':
                return await handleCreateThumbnail(req, res, decoded);
            default:
                return res.status(400).json({ error: 'Invalid action specified' });
        }
    }
    catch (error) {
        console.error('AI editing API error:', error);
        if (error instanceof Error) {
            return res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
}
async function handleAnalyzeVideo(req, res, decoded) {
    const { videoUrl } = req.body;
    if (!videoUrl) {
        return res.status(400).json({ error: 'Video URL is required' });
    }
    try {
        const analysis = await analyzeVideo(videoUrl);
        res.status(200).json({
            success: true,
            data: analysis,
            message: 'Video analysis completed successfully'
        });
    }
    catch (error) {
        console.error('Video analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze video' });
    }
}
async function handleGenerateSuggestions(req, res, decoded) {
    const { videoUrl, prompt } = req.body;
    if (!videoUrl || !prompt) {
        return res.status(400).json({ error: 'Video URL and prompt are required' });
    }
    try {
        const suggestions = await generateAutoEditSuggestions(videoUrl, prompt);
        res.status(200).json({
            success: true,
            data: suggestions,
            message: 'Edit suggestions generated successfully'
        });
    }
    catch (error) {
        console.error('Suggestions generation error:', error);
        res.status(500).json({ error: 'Failed to generate edit suggestions' });
    }
}
async function handleApplyEdit(req, res, decoded) {
    const editRequest = req.body;
    if (!editRequest.videoUrl || !editRequest.editType) {
        return res.status(400).json({
            error: 'Video URL and edit type are required'
        });
    }
    try {
        const result = await applyVideoEdit(editRequest);
        // Log usage for analytics
        console.log(`Video edit applied for user ${decoded.userId}:`, {
            editType: editRequest.editType,
            processingTime: result.processingTime,
            duration: result.duration,
        });
        res.status(200).json({
            success: true,
            data: result,
            message: 'Video edit applied successfully'
        });
    }
    catch (error) {
        console.error('Video edit error:', error);
        res.status(500).json({ error: 'Failed to apply video edit' });
    }
}
async function handleBatchEdit(req, res, decoded) {
    const { requests } = req.body;
    if (!Array.isArray(requests) || requests.length === 0) {
        return res.status(400).json({
            error: 'Requests array is required and must not be empty'
        });
    }
    if (requests.length > 10) {
        return res.status(400).json({
            error: 'Maximum 10 videos can be edited in a single batch'
        });
    }
    try {
        const results = await batchEditVideos(requests);
        // Log usage for analytics
        console.log(`Batch video edit completed for user ${decoded.userId}:`, {
            videoCount: requests.length,
            totalProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0),
        });
        res.status(200).json({
            success: true,
            data: results,
            message: `Successfully processed ${results.length} video edits`
        });
    }
    catch (error) {
        console.error('Batch edit error:', error);
        res.status(500).json({ error: 'Failed to process batch video edits' });
    }
}
async function handleCreateThumbnail(req, res, decoded) {
    const { videoUrl, timestamp = 0 } = req.body;
    if (!videoUrl) {
        return res.status(400).json({ error: 'Video URL is required' });
    }
    try {
        const thumbnailUrl = await createVideoThumbnail(videoUrl, timestamp);
        res.status(200).json({
            success: true,
            data: { thumbnailUrl },
            message: 'Thumbnail generated successfully'
        });
    }
    catch (error) {
        console.error('Thumbnail generation error:', error);
        res.status(500).json({ error: 'Failed to generate thumbnail' });
    }
}
