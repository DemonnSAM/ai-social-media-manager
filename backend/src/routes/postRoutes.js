import express from 'express';
import multer from 'multer';
import { createPost, deletePost } from '../controllers/postController.js';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /api/posts - as per user request
router.post('/', upload.array('media', 10), createPost);

// DELETE /api/posts/:id - delete a draft or post
router.delete('/:id', deletePost);

export default router;
