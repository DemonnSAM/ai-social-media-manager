import { GoogleGenerativeAI } from '@google/generative-ai';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const TEMP_FRAMES_DIR = '/tmp/socialai_frames';

function ensureTempDir() {
  if (!fs.existsSync(TEMP_FRAMES_DIR)) {
    fs.mkdirSync(TEMP_FRAMES_DIR, { recursive: true });
  }
}

function cleanupFrames(framePaths) {
  for (const fp of framePaths) {
    try {
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    } catch (e) {
      console.warn('[aiService] Could not clean up frame:', fp, e.message);
    }
  }
}

/**
 * Gets the duration of a video in seconds using ffprobe.
 */
function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata?.format?.duration ?? 10;
      resolve(duration);
    });
  });
}

/**
 * Extracts a single frame from a video at a specific timestamp.
 */
function extractFrame(videoPath, outputPath, timeSeconds) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timeSeconds],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '640x?',
      })
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err));
  });
}

/**
 * Parses Gemini's JSON response, stripping markdown fences if present.
 */
function parseGeminiJson(text) {
  let cleaned = text.trim();
  // Strip ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Generates a caption and hashtags from a single image buffer.
 * @param {Buffer} imageBuffer
 * @param {string} mimeType  e.g. 'image/jpeg'
 */
export async function generateCaptionFromImage(imageBuffer, mimeType) {
  const prompt = `You are a social media expert. Analyze this image and generate:
1. An engaging social media caption (2-3 sentences, conversational tone)
2. 10 relevant hashtags

Return ONLY a JSON object in this exact format, no markdown:
{
  "caption": "your caption here",
  "hashtags": "#tag1 #tag2 #tag3 #tag4 #tag5 #tag6 #tag7 #tag8 #tag9 #tag10"
}`;

  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType,
    },
  };

  const result = await model.generateContent([prompt, imagePart]);
  const text = result.response.text();

  return parseGeminiJson(text);
}

/**
 * Generates a caption and hashtags from a video buffer by extracting 3 frames.
 * @param {Buffer} videoBuffer
 * @param {string} filename  Original filename (used for tmp file extension)
 */
export async function generateCaptionFromVideo(videoBuffer, filename) {
  ensureTempDir();

  const ext = path.extname(filename) || '.mp4';
  const tmpId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const tmpVideoPath = path.join(TEMP_FRAMES_DIR, `${tmpId}${ext}`);

  // Write video buffer to tmp file
  fs.writeFileSync(tmpVideoPath, videoBuffer);

  const framePaths = [];

  try {
    // Get video duration
    const duration = await getVideoDuration(tmpVideoPath);

    // Calculate 3 timestamps
    const t1 = 1;
    const t2 = Math.max(1, duration / 2);
    const t3 = Math.max(1, duration - 3);

    const timestamps = [...new Set([t1, t2, t3].map(t => Math.min(t, duration - 0.5).toFixed(2)))];

    // Extract frames
    for (let i = 0; i < timestamps.length; i++) {
      const framePath = path.join(TEMP_FRAMES_DIR, `${tmpId}_frame${i + 1}.jpg`);
      await extractFrame(tmpVideoPath, framePath, parseFloat(timestamps[i]));
      framePaths.push(framePath);
    }

    // Build image parts for Gemini
    const imageParts = framePaths
      .filter(fp => fs.existsSync(fp))
      .map(fp => ({
        inlineData: {
          data: fs.readFileSync(fp).toString('base64'),
          mimeType: 'image/jpeg',
        },
      }));

    if (imageParts.length === 0) {
      throw new Error('No frames could be extracted from video');
    }

    const prompt = `You are a social media expert. These are ${imageParts.length} frames from a video.
Analyze the content and generate:
1. An engaging social media caption (2-3 sentences, conversational tone)
2. 10 relevant hashtags

Return ONLY a JSON object in this exact format, no markdown:
{
  "caption": "your caption here",
  "hashtags": "#tag1 #tag2 #tag3 #tag4 #tag5 #tag6 #tag7 #tag8 #tag9 #tag10"
}`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const text = result.response.text();

    return parseGeminiJson(text);
  } finally {
    // Always clean up
    cleanupFrames(framePaths);
    try {
      if (fs.existsSync(tmpVideoPath)) fs.unlinkSync(tmpVideoPath);
    } catch (e) {
      console.warn('[aiService] Could not clean up tmp video:', e.message);
    }
  }
}

/**
 * Rewrites a caption with a given tone and style variant.
 * @param {string} caption
 * @param {string} tone  - 'formal' | 'balanced' | 'casual'
 * @param {string|null} variant - 'viral' | 'professional' | 'funny' | null
 */
export async function rewriteCaption(caption, tone, variant) {
  const prompt = `Rewrite this social media caption.
Tone: ${tone} (formal or casual)
Style: ${variant || 'none'} (viral=hooks+emotion, professional=polished+credible, funny=witty+humor)
Original caption: ${caption}
Return ONLY a JSON object, no markdown:
{ "caption": "rewritten caption here" }`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = parseGeminiJson(text);
  return parsed.caption;
}

/**
 * Adapts a caption for a specific social platform.
 * @param {string} caption
 * @param {'instagram'|'facebook'|'twitter'} platform
 */
export async function adaptForPlatform(caption, platform) {
  const prompt = `Adapt this social media caption for ${platform}.
Instagram: casual, emoji-friendly, 2200 char max, hashtags encouraged
Facebook: conversational, longer form ok, personal tone
Twitter: concise, under 280 chars, punchy, 1-2 hashtags max
Original caption: ${caption}
Return ONLY a JSON object, no markdown:
{ "caption": "adapted caption here" }`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = parseGeminiJson(text);
  return parsed.caption;
}

/**
 * Analyzes a post for performance potential.
 * @param {string} caption
 * @param {string} hashtags
 */
export async function analyzePost(caption, hashtags) {
  const prompt = `Analyze this social media post for performance potential.
Caption: ${caption}
Hashtags: ${hashtags || 'none'}
Return ONLY a JSON object, no markdown:
{
  "virality_score": <number between 0-100>,
  "good": ["point 1", "point 2", "point 3"],
  "bad": ["point 1", "point 2"],
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseGeminiJson(text);
}

/**
 * Optimizes a post caption and hashtags for maximum engagement.
 * @param {string} caption
 * @param {string} hashtags
 * @param {string} context  - optional user-provided context
 * @param {'instagram'|'facebook'|'twitter'|'all'} platform
 */
export async function optimizeContent(caption, hashtags, context, platform) {
  const prompt = `Optimize this social media post for maximum engagement.
Platform: ${platform || 'all'}
Current caption: ${caption}
Current hashtags: ${hashtags || 'none'}
Additional context: ${context || 'none'}

Return ONLY a JSON object, no markdown:
{
  "caption": "optimized caption",
  "hashtags": "#tag1 #tag2 ...",
  "improvements": ["what was changed and why"],
  "virality_score": <number between 0-100 indicating the NEW predicted virality>,
  "good": ["point 1", "point 2", "point 3"],
  "bad": ["point 1", "point 2"],
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseGeminiJson(text);
}
