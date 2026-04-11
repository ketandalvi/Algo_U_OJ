import express from 'express';
import {
  createSubmission,
  getMySubmissions,
  getSubmissionById,
} from '../controllers/submissionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All submission routes require authentication
router.post('/', protect, createSubmission);
router.get('/me', protect, getMySubmissions);
router.get('/:id', protect, getSubmissionById);

export default router;