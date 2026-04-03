import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Check if Authorization header exists and starts with "Bearer"
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 2. No token found
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorised — no token provided',
      });
    }

    // 3. Verify the token is genuine and not expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Find the user this token belongs to
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorised — user no longer exists',
      });
    }

    // 5. Attach user to the request object for controllers to use
    req.user = user;

    // 6. Move on to the next middleware or controller
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorised — invalid token',
    });
  }
};

// Use this AFTER protect — it assumes req.user already exists
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Not authorised — admin only',
    });
  }
};