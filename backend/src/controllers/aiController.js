import { generateCaptionFromImage, generateCaptionFromVideo, rewriteCaption as svcRewrite, adaptForPlatform as svcAdapt, analyzePost as svcAnalyze, optimizeContent as svcOptimize } from '../services/aiService.js';

export const listModels = async (req, res) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[aiController] listModels error:', error);
    res.status(500).json({ error: error.message || 'Failed to list models' });
  }
};

export const generateCaption = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No media file provided. Please upload an image or video.' });
    }

    const { buffer, mimetype, originalname } = file;
    let result;

    if (mimetype.startsWith('image/')) {
      result = await generateCaptionFromImage(buffer, mimetype);
    } else if (mimetype.startsWith('video/')) {
      result = await generateCaptionFromVideo(buffer, originalname);
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Please upload an image or video.' });
    }

    return res.status(200).json({
      caption: result.caption,
      hashtags: result.hashtags,
    });
  } catch (error) {
    console.error('[aiController] generateCaption error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate caption. Please try again.',
    });
  }
};

export const rewriteCaptionHandler = async (req, res) => {
  try {
    const { caption, tone, variant } = req.body;
    if (!caption) return res.status(400).json({ error: 'caption is required' });
    const result = await svcRewrite(caption, tone || 'balanced', variant || null);
    return res.status(200).json({ caption: result });
  } catch (error) {
    console.error('[aiController] rewriteCaption error:', error);
    return res.status(500).json({ error: error.message || 'Failed to rewrite caption' });
  }
};

export const adaptForPlatformHandler = async (req, res) => {
  try {
    const { caption, platform } = req.body;
    if (!caption) return res.status(400).json({ error: 'caption is required' });
    if (!platform) return res.status(400).json({ error: 'platform is required' });
    const result = await svcAdapt(caption, platform);
    return res.status(200).json({ caption: result });
  } catch (error) {
    console.error('[aiController] adaptForPlatform error:', error);
    return res.status(500).json({ error: error.message || 'Failed to adapt caption' });
  }
};

export const analyzePostHandler = async (req, res) => {
  try {
    const { caption, hashtags } = req.body;
    if (!caption) return res.status(400).json({ error: 'caption is required' });
    const result = await svcAnalyze(caption, hashtags || '');
    return res.status(200).json(result);
  } catch (error) {
    console.error('[aiController] analyzePost error:', error);
    return res.status(500).json({ error: error.message || 'Failed to analyze post' });
  }
};

export const optimizeContentHandler = async (req, res) => {
  try {
    const { caption, hashtags, context, platform } = req.body;
    if (!caption) return res.status(400).json({ error: 'caption is required' });
    const result = await svcOptimize(caption, hashtags || '', context || '', platform || 'all');
    return res.status(200).json(result);
  } catch (error) {
    console.error('[aiController] optimizeContent error:', error);
    return res.status(500).json({ error: error.message || 'Failed to optimize content' });
  }
};
