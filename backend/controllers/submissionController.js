import Submission from '../models/Submission.js';
import Problem from '../models/Problem.js';
import { judge } from '../executionEngine/judge.js';
import { checkDockerAvailable } from '../executionEngine/runner.js';

const SUPPORTED_LANGUAGES = ['python', 'javascript', 'cpp'];

// POST /api/submissions
export const createSubmission = async (req, res, next) => {
  try {
    // 0. Validate request body
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be a valid JSON object',
      });
    }

    // 1. Check required fields exist
    if (!('problemId' in req.body) || !('code' in req.body) || !('language' in req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide problemId, code and language',
      });
    }

    const { problemId, code, language } = req.body;

    // 2. Type validation
    if (typeof problemId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'problemId must be a string',
      });
    }

    if (typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Code must be a string',
      });
    }

    if (typeof language !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Language must be a string',
      });
    }

    // 3. Value validation
    if (code.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Code cannot be empty',
      });
    }

    if (code.length > 100000) {
      return res.status(400).json({
        success: false,
        message: 'Code must not exceed 100000 characters',
      });
    }

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({
        success: false,
        message: 'Language must be python, javascript or cpp',
      });
    }

    // 4. Validate problemId is a valid MongoDB ObjectId format
    if (!/^[a-f\d]{24}$/i.test(problemId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid problem ID format',
      });
    }

    // 5. Fetch problem from DB — must be published
    const problem = await Problem.findOne({
      _id: problemId,
      status: 'published',
    });

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found',
      });
    }

    // 6. Check Docker is available before attempting execution
    const dockerAvailable = await checkDockerAvailable();
    if (!dockerAvailable) {
      return res.status(503).json({
        success: false,
        message: 'Execution service temporarily unavailable. Please try again.',
      });
    }

    // 7. Record start time for runtime calculation
    const startTime = Date.now();

    // 8. Run the judge
    const judgeResult = await judge(
      code,
      language,
      problem.testCases,
      problem.timeLimit,
      problem.memoryLimit
    );

    const runtime = Date.now() - startTime;

    // 9. Save submission to database
    const submission = await Submission.create({
      userId: req.user._id,
      problemId: problem._id,
      code,
      language,
      verdict: judgeResult.verdict,
      runtime,
      passedCount: judgeResult.passedCount,
      totalCount: judgeResult.totalCount,
      errorMessage: judgeResult.error || null,
    });

    // 10. Return result — never return test case details
    res.status(201).json({
      success: true,
      data: {
        id: submission._id,
        verdict: submission.verdict,
        runtime: submission.runtime,
        passedCount: submission.passedCount,
        totalCount: submission.totalCount,
        language: submission.language,
        errorMessage: submission.errorMessage,
        submittedAt: submission.createdAt,
      },
    });

  } catch (error) {
    next(error);
  }
};

// GET /api/submissions/me
export const getMySubmissions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      Submission.find({ userId: req.user._id })
        .populate('problemId', 'title slug difficulty')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-code'),  // don't return code in list view
      Submission.countDocuments({ userId: req.user._id }),
    ]);

    res.status(200).json({
      success: true,
      count: submissions.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: submissions,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/submissions/:id
export const getSubmissionById = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('problemId', 'title slug difficulty')
      .populate('userId', 'username');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found',
      });
    }

    // Users can only see their own submissions
    if (submission.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorised to view this submission',
      });
    }

    res.status(200).json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
};