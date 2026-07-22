const express = require('express');
const router = express.Router();
const { verifyStudentProgress } = require('../controllers/publicController');

// @route   GET /api/public/verify/:slug
// @desc    Get student progress card by VCode/slug
// @access  Public
router.get('/verify/:slug', verifyStudentProgress);

module.exports = router;
