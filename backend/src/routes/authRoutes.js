import express from 'express';
import { initiateMetaOAuth, handleMetaCallback } from '../controllers/metaAuthController.js';

const router = express.Router();

router.get('/meta', initiateMetaOAuth);
router.get('/meta/callback', handleMetaCallback);

export default router;
