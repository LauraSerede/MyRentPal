// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// @desc  Protect routes — verifies the JWT in the Authorization header
// @usage Add `protect` to any route that requires a logged-in user
const protect = async (req, res, next) => {
  let token;

  // JWT is sent as: Authorization: Bearer <token>
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract the token from the header
      token = req.headers.authorization.split(' ')[1];

      // Verify the token and decode the payload
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach the user (without the password) to the request object
      req.user = await User.findById(decoded.id).select('-password');

      next(); // Token is valid — move on to the route handler
    } catch (error) {
      console.error(error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// @desc  Restrict access to specific roles (e.g. landlord only)
// @usage Add `restrictTo('landlord')` after `protect` on a route
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Only ${roles.join(' or ')} can perform this action.`,
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
