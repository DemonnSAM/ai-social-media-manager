import express from 'express';
import { getFacebookPages, disconnectAccount } from '../controllers/metaAuthController.js';

const router = express.Router();

router.get('/facebook/pages', getFacebookPages);
router.delete('/accounts/:id', disconnectAccount);

export default router;
