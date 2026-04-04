import Problem from '../models/Problem.js';
import mongoose from 'mongoose';

// GET /api/problems — fetch all problems (public, no test cases)
export const getAllProblems = async (req, res, next) => {
  try {
    const problems = await Problem.find(
      { status: 'published' },
      'title slug difficulty tags createdAt' // only these fields
    );
    res.status(200).json({
      success: true,
      count: problems.length,
      data: problems,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/problems/:slug — fetch one problem (no test cases)
export const getProblemBySlug = async (req, res, next) => {
  try {
    // Normalize slug: trim and lowercase
    const normalizedSlug = req.params.slug.trim().toLowerCase();

    const problem = await Problem.findOne(
      { slug: normalizedSlug, status: 'published' },
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
    next(error);
  }
};

// POST /api/problems — create a new problem (admin only)
export const createProblem = async (req, res, next) => {
  try {
    // 0. Validate req.body is an object
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be a valid JSON object',
      });
    }

    // 1. Check all required fields exist in request body
    if (!('title' in req.body) || !('slug' in req.body) || !('description' in req.body) || !('difficulty' in req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, slug, description, and difficulty',
      });
    }

    let {
      title,
      slug,
      description,
      difficulty,
      tags,
      testCases,
      starterCode,
      timeLimit,
      memoryLimit,
    } = req.body;

    // 2. Type validation
    if (typeof title !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Title must be a string',
      });
    }

    if (typeof slug !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Slug must be a string',
      });
    }

    if (typeof description !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Description must be a string',
      });
    }

    if (typeof difficulty !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Difficulty must be a string',
      });
    }

    // Check trimmed values are not empty and reassign
    title = title.trim();
    slug = slug.trim().toLowerCase();
    description = description.trim();

    if (!title || !slug || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide non-empty title, slug, and description',
      });
    }

    if (title.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Title must be at least 3 characters',
      });
    }

    if (title.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Title must not exceed 200 characters',
      });
    }

    if (description.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Description must be at least 10 characters',
      });
    }

    if (description.length > 50000) {
      return res.status(400).json({
        success: false,
        message: 'Description must not exceed 50000 characters',
      });
    }

    if (slug.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Slug must be at least 2 characters',
      });
    }

    if (slug.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Slug must not exceed 100 characters',
      });
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return res.status(400).json({
        success: false,
        message: 'Slug can only contain lowercase letters, numbers and hyphens',
      });
    }

    // Validate difficulty enum
    if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        message: 'Difficulty must be Easy, Medium, or Hard',
      });
    }

    // 3. Validate tags
    if (tags && !Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        message: 'Tags must be an array',
      });
    }

    if (tags && tags.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Problem must not have more than 20 tags',
      });
    }

    // Validate each tag is a string
    if (tags) {
      for (let i = 0; i < tags.length; i++) {
        if (typeof tags[i] !== 'string') {
          return res.status(400).json({
            success: false,
            message: `Tag ${i + 1} must be a string`,
          });
        }
        if (tags[i].trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: `Tag ${i + 1} cannot be empty`,
          });
        }
      }
      // Reassign trimmed and lowercased tags
      tags = tags.map(tag => tag.trim().toLowerCase());
    }

    // 4. Validate testCases
    if (!('testCases' in req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Test cases are required',
      });
    }

    if (!Array.isArray(testCases)) {
      return res.status(400).json({
        success: false,
        message: 'Test cases must be an array',
      });
    }

    if (testCases.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Problem must have at least one test case',
      });
    }

    if (testCases.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Problem must not have more than 500 test cases',
      });
    }

    // Validate each test case
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];

      // Check test case is an object
      if (!tc || typeof tc !== 'object' || Array.isArray(tc)) {
        return res.status(400).json({
          success: false,
          message: `Test case ${i + 1} must be an object`,
        });
      }

      // Use 'in' operator to check field existence (not falsy check)
      if (!('input' in tc) || !('expectedOutput' in tc)) {
        return res.status(400).json({
          success: false,
          message: `Test case ${i + 1} must have input and expectedOutput`,
        });
      }
      if (typeof tc.input !== 'string' || typeof tc.expectedOutput !== 'string') {
        return res.status(400).json({
          success: false,
          message: `Test case ${i + 1} input and expectedOutput must be strings`,
        });
      }
      // Validate that input and expectedOutput are not just whitespace
      if (tc.input.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: `Test case ${i + 1} input cannot be empty or whitespace-only`,
        });
      }
      if (tc.expectedOutput.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: `Test case ${i + 1} expected output cannot be empty or whitespace-only`,
        });
      }
    }

    // 5. Validate starterCode
    if (starterCode) {
      if (typeof starterCode !== 'object' || Array.isArray(starterCode)) {
        return res.status(400).json({
          success: false,
          message: 'Starter code must be an object',
        });
      }
      const validLanguages = ['javascript', 'python', 'cpp'];
      for (const lang of Object.keys(starterCode)) {
        if (!validLanguages.includes(lang)) {
          return res.status(400).json({
            success: false,
            message: `Invalid starter code language: ${lang}. Must be javascript, python, or cpp`,
          });
        }
        if (typeof starterCode[lang] !== 'string') {
          return res.status(400).json({
            success: false,
            message: `Starter code for ${lang} must be a string`,
          });
        }
      }
    }

    // 6. Validate numeric fields (if provided)
    if ('timeLimit' in req.body) {
      if (typeof timeLimit !== 'number' || !Number.isFinite(timeLimit)) {
        return res.status(400).json({
          success: false,
          message: 'Time limit must be a valid finite number',
        });
      }
      if (timeLimit < 1000 || timeLimit > 15000) {
        return res.status(400).json({
          success: false,
          message: 'Time limit must be between 1000ms and 15000ms',
        });
      }
    }

    if ('memoryLimit' in req.body) {
      if (typeof memoryLimit !== 'number' || !Number.isFinite(memoryLimit)) {
        return res.status(400).json({
          success: false,
          message: 'Memory limit must be a valid finite number',
        });
      }
      if (memoryLimit < 16 || memoryLimit > 512) {
        return res.status(400).json({
          success: false,
          message: 'Memory limit must be between 16MB and 512MB',
        });
      }
    }

    // 7. Create the problem with createdBy set to current user
    const problem = await Problem.create({
      title,
      slug,
      description,
      difficulty,
      tags: tags || [],
      testCases,
      starterCode: starterCode || { javascript: '', python: '', cpp: '' },
      timeLimit: timeLimit !== undefined ? timeLimit : 5000,
      memoryLimit: memoryLimit !== undefined ? memoryLimit : 128,
      createdBy: req.user._id,
      status: 'draft',  // new problems start as draft
    });

    res.status(201).json({ success: true, data: problem });
  } catch (error) {
    // Handle duplicate slug error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.slug) {
      return res.status(400).json({
        success: false,
        message: 'A problem with this slug already exists',
      });
    }
    next(error);
  }
};

// DELETE /api/problems/:id — delete a problem (admin only)
export const deleteProblem = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid problem ID format',
      });
    }

    const problem = await Problem.findByIdAndDelete(id);
    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found',
      });
    }
    res.status(200).json({ success: true, message: 'Problem deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/problems/:id — update a problem (admin only)
export const updateProblem = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request body is an object
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be a valid JSON object',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid problem ID format',
      });
    }

    // Only allow these fields to be updated
    const allowedUpdates = [
      'title', 'description', 'difficulty',
      'tags', 'starterCode', 'timeLimit',
      'memoryLimit', 'status',
    ];

    const updates = {};
    for (const key of allowedUpdates) {
      if (key in req.body) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update',
      });
    }

    // Validate each update field
    if ('title' in updates) {
      if (typeof updates.title !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Title must be a string',
        });
      }
      const trimmedTitle = updates.title.trim();
      if (!trimmedTitle || trimmedTitle.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Title must be at least 3 characters',
        });
      }
      if (trimmedTitle.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Title must not exceed 200 characters',
        });
      }
      updates.title = trimmedTitle;
    }

    if ('description' in updates) {
      if (typeof updates.description !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Description must be a string',
        });
      }
      const trimmedDesc = updates.description.trim();
      if (!trimmedDesc || trimmedDesc.length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Description must be at least 10 characters',
        });
      }
      if (trimmedDesc.length > 50000) {
        return res.status(400).json({
          success: false,
          message: 'Description must not exceed 50000 characters',
        });
      }
      updates.description = trimmedDesc;
    }

    if ('difficulty' in updates) {
      if (typeof updates.difficulty !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Difficulty must be a string',
        });
      }
      if (!['Easy', 'Medium', 'Hard'].includes(updates.difficulty)) {
        return res.status(400).json({
          success: false,
          message: 'Difficulty must be Easy, Medium, or Hard',
        });
      }
    }

    if ('tags' in updates) {
      if (!Array.isArray(updates.tags)) {
        return res.status(400).json({
          success: false,
          message: 'Tags must be an array',
        });
      }
      if (updates.tags.length > 20) {
        return res.status(400).json({
          success: false,
          message: 'Problem must not have more than 20 tags',
        });
      }
      for (let i = 0; i < updates.tags.length; i++) {
        if (typeof updates.tags[i] !== 'string') {
          return res.status(400).json({
            success: false,
            message: `Tag ${i + 1} must be a string`,
          });
        }
        if (updates.tags[i].trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: `Tag ${i + 1} cannot be empty`,
          });
        }
      }
      // Reassign trimmed and lowercased tags
      updates.tags = updates.tags.map(tag => tag.trim().toLowerCase());
    }

    if ('starterCode' in updates) {
      if (updates.starterCode === null || typeof updates.starterCode !== 'object' || Array.isArray(updates.starterCode)) {
        return res.status(400).json({
          success: false,
          message: 'Starter code must be an object',
        });
      }
      const validLanguages = ['javascript', 'python', 'cpp'];
      for (const lang of Object.keys(updates.starterCode)) {
        if (!validLanguages.includes(lang)) {
          return res.status(400).json({
            success: false,
            message: `Invalid starter code language: ${lang}. Must be javascript, python, or cpp`,
          });
        }
        if (typeof updates.starterCode[lang] !== 'string') {
          return res.status(400).json({
            success: false,
            message: `Starter code for ${lang} must be a string`,
          });
        }
      }
    }

    if ('timeLimit' in updates) {
      if (typeof updates.timeLimit !== 'number' || !Number.isFinite(updates.timeLimit)) {
        return res.status(400).json({
          success: false,
          message: 'Time limit must be a valid finite number',
        });
      }
      if (updates.timeLimit < 1000 || updates.timeLimit > 15000) {
        return res.status(400).json({
          success: false,
          message: 'Time limit must be between 1000ms and 15000ms',
        });
      }
    }

    if ('memoryLimit' in updates) {
      if (typeof updates.memoryLimit !== 'number' || !Number.isFinite(updates.memoryLimit)) {
        return res.status(400).json({
          success: false,
          message: 'Memory limit must be a valid finite number',
        });
      }
      if (updates.memoryLimit < 16 || updates.memoryLimit > 512) {
        return res.status(400).json({
          success: false,
          message: 'Memory limit must be between 16MB and 512MB',
        });
      }
    }

    if ('status' in updates) {
      if (typeof updates.status !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Status must be a string',
        });
      }
      if (!['draft', 'published', 'archived'].includes(updates.status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be draft, published or archived',
        });
      }
    }

    const problem = await Problem.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,          // return updated document
        runValidators: true, // run schema validators on update
      }
    );

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found',
      });
    }

    res.status(200).json({ success: true, data: problem });
  } catch (error) {
    next(error);
  }
};