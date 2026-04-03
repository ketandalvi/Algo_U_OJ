import express from 'express';
import {
  getAllProblems,
  getProblemBySlug,
  createProblem,
  deleteProblem,
} from '../controllers/problemController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getAllProblems);
router.get('/:slug', getProblemBySlug);
router.post('/', protect, adminOnly, createProblem);
router.delete('/:id', protect, adminOnly, deleteProblem);

export default router;