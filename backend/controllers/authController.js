import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import bcrypt from 'bcryptjs';

// Constants
const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/; // Fixed: {2,} instead of {2,3}
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
// Pre-computed valid bcrypt hash used ONLY for timing attack mitigation
// This ensures consistent response time whether user exists or not
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

// POST /api/auth/register
export const registerUser = async (req, res, next) => {
  try {
    // 0. Validate req.body is an object (catches null, arrays, primitives)
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be a valid JSON object',
      });
    }

    // Add this before destructuring
    if (!('username' in req.body) || !('email' in req.body) || !('password' in req.body))   {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email and password',
      });
    }

    const { username, email, password } = req.body;

    // 1. Type validation first (avoid DB queries on invalid types)
    if (typeof username !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Username must be a string',
      });
    }

    if (typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email must be a string',
      });
    }

    if (typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password must be a string',
      });
    }

    // 2. Trim and normalize all fields
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    // 3. Check all trimmed fields are provided and not empty
    if (!trimmedUsername || !trimmedEmail || !trimmedPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email and password',
      });
    }

    // 4. Validate username length
    if (trimmedUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters',
      });
    }

    if (trimmedUsername.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Username must not exceed 20 characters',
      });
    }

    // 5. Validate username format (only letters, numbers, underscores)
    if (!USERNAME_REGEX.test(trimmedUsername)) {
      return res.status(400).json({
        success: false,
        message: 'Username can only contain letters, numbers, and underscores',
      });
    }

    // 6. Validate email format
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // 7. Validate password length
    if (trimmedPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    if (trimmedPassword.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Password must not exceed 128 characters',
      });
    }

    // 8. Check if email already exists
    const emailExists = await User.findOne({ email: trimmedEmail });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // 9. Check if username already exists (already lowercased)
    const usernameExists = await User.findOne({ username: trimmedUsername });
    if (usernameExists) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken',
      });
    }

    // 10. Create the user — password is auto-hashed by the pre('save') hook
    const user = await User.create({
      username: trimmedUsername,
      email: trimmedEmail,
      password: trimmedPassword,
    });

    // 11. Generate JWT token
    const token = generateToken(user._id);

    // 12. Send response — never send password back
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
export const loginUser = async (req, res, next) => {
  try {
    // 0. Validate req.body is an object
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be a valid JSON object',
      });
    }

    if (!('email' in req.body) || !('password' in req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const { email, password } = req.body;

    // 1. Type validation first
    if (typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email must be a string',
      });
    }

    if (typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Password must be a string',
      });
    }

    // 2. Trim and normalize
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    // 3. Check fields are provided and not empty (after trimming)
    if (!trimmedEmail || !trimmedPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // 4. Validate email format
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // 5. Find user by email
    // We use .select('+password') because we need it for comparison
    const user = await User.findOne({ email: trimmedEmail }).select('+password');

    // Timing attack mitigation: Use constant-time comparison regardless of user existence
    // If user doesn't exist, do dummy bcrypt comparison to match timing of password check
    let isMatch = false;
    if (user) {
      isMatch = await user.comparePassword(trimmedPassword);
    } else {
      // Dummy bcrypt call to prevent timing attacks (user enumeration)
      // Using a fake hash so the comparison always fails but takes similar time
      await bcrypt.compare(trimmedPassword, DUMMY_HASH);
    }

    if (!user || !isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // 7. Generate token and respond
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    // req.user is already set by authMiddleware
    // But add safety check in case middleware wasn't applied properly
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorised — no user in request',
      });
    }

    // Find by ID to get fresh data from DB
    const user = await User.findById(req.user._id);

    // User might have been deleted after token was issued
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User no longer exists',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};