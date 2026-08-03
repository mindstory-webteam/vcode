const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');
const socketHelper = require('../socketHelper');

// @route   POST /api/notifications/broadcast
// @desc    Send a broadcast notification
// @access  Private/SuperAdmin
router.post('/broadcast', protect, authorize('superadmin'), async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Please provide title and message' });
    }

    const notification = await Notification.create({
      title,
      message,
      type: 'broadcast',
    });

    socketHelper.emitBroadcastNotification(notification);

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/notifications/mine
// @desc    Get user notifications (excluding deleted ones)
// @access  Private
router.get('/mine', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({
      type: 'broadcast',
      deletedBy: { $ne: req.user._id },
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      notifications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all user's notifications as read
// @access  Private
router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      {
        type: 'broadcast',
        deletedBy: { $ne: req.user._id },
        readBy: { $ne: req.user._id }
      },
      {
        $addToSet: { readBy: req.user._id }
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete (hide) a notification for the current user
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (!notification.deletedBy.includes(req.user._id)) {
      notification.deletedBy.push(req.user._id);
      await notification.save();
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/notifications
// @desc    Get all notifications (history for admin)
// @access  Private/SuperAdmin
router.get('/', protect, authorize('superadmin'), async (req, res) => {
  try {
    const notifications = await Notification.find({}).sort({ createdAt: -1 });
    res.json({
      success: true,
      notifications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
