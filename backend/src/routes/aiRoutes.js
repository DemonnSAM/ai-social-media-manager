import express from 'express';
import multer from 'multer';
import {
  generateCaption,
  listModels,
  rewriteCaptionHandler,
  adaptForPlatformHandler,
  analyzePostHandler,
  optimizeContentHandler,
  getDashboardInsight,
} from '../controllers/aiController.js';

const router = express.Router();

// Use memory storage — we pass the buffer directly to Gemini / ffmpeg
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/ai/models  — list all available Gemini models for this API key
router.get('/models', listModels);

// POST /api/ai/generate-caption (multipart — requires media file)
router.post('/generate-caption', upload.single('media'), generateCaption);

// POST /api/ai/rewrite  — rewrite caption with tone/variant
router.post('/rewrite', rewriteCaptionHandler);

// POST /api/ai/adapt  — adapt caption for platform
router.post('/adapt', adaptForPlatformHandler);

// POST /api/ai/analyze  — analyze post performance
router.post('/analyze', analyzePostHandler);

// POST /api/ai/optimize  — optimize caption + hashtags
router.post('/optimize', optimizeContentHandler);

// GET /api/ai/dashboard-insight  — AI performance insight for dashboard (cached 6h)
router.get('/dashboard-insight', getDashboardInsight);

export default router;
