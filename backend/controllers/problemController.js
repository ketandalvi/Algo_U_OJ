import Problem from '../models/Problem.js';

// GET /api/problems — fetch all problems (no test cases)
export const getAllProblems = async (req, res) => {
  try {
    const problems = await Problem.find(
      {},
      'title slug difficulty tags createdAt' // only these fields
    );
    res.status(200).json({
      success: true,
      count: problems.length,
      data: problems,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/problems/:slug — fetch one problem (no test cases)
export const getProblemBySlug = async (req, res) => {
  try {
    const problem = await Problem.findOne(
      { slug: req.params.slug },
      '-testCases'  // exclude test cases from response
    );
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found',
      });
    }
    res.status(200).json({ success: true, data: problem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/problems — create a new problem
export const createProblem = async (req, res) => {
  try {
    const problem = await Problem.create(req.body);
    res.status(201).json({ success: true, data: problem });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/problems/:id — delete a problem
export const deleteProblem = async (req, res) => {
  try {
    const problem = await Problem.findByIdAndDelete(req.params.id);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found',
      });
    }
    res.status(200).json({ success: true, message: 'Problem deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};