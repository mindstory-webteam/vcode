const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/notifications/mine
// @desc    Get user notifications (mocked to prevent frontend 404 errors)
// @access  Private
router.get('/mine', protect, (req, res) => {
  res.json({
    success: true,
    notifications: []
  });
});

module.exports = router;
