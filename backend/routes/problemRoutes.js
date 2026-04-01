import express from 'express';
import {
  getAllProblems,
  getProblemBySlug,
  createProblem,
  deleteProblem,
} from '../controllers/problemController.js';

const router = express.Router();

router.get('/', getAllProblems);
router.get('/:slug', getProblemBySlug);
router.post('/', createProblem);
router.delete('/:id', deleteProblem);

export default router;