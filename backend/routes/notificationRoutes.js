const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');
const socketHelper = require('../socketHelper');

// @route   POST /api/notifications/broadcast
// @desc    Send a broadcast or targeted notification
// @access  Private/SuperAdmin
router.post('/broadcast', protect, authorize('superadmin'), async (req, res) => {
  try {
    const { title, message, scheduledFor, targetType, targetDepartment, targetUser } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Please provide title and message' });
    }

    if (targetType === 'department' && !targetDepartment) {
      return res.status(400).json({ success: false, message: 'Please select a target department' });
    }

    if (targetType === 'student' && !targetUser) {
      return res.status(400).json({ success: false, message: 'Please select a target student' });
    }

    let parsedScheduledFor = null;
    let isFuture = false;

    if (scheduledFor) {
      parsedScheduledFor = new Date(scheduledFor);
      if (isNaN(parsedScheduledFor.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid schedule date' });
      }
      isFuture = parsedScheduledFor.getTime() > Date.now();
    }

    const notification = await Notification.create({
      title,
      message,
      type: targetType === 'all' ? 'broadcast' : 'personal',
      targetType: targetType || 'all',
      targetDepartment: targetType === 'department' ? targetDepartment : null,
      targetUser: targetType === 'student' ? targetUser : null,
      scheduledFor: parsedScheduledFor,
      sentAt: isFuture ? null : (parsedScheduledFor || new Date()),
    });

    // Populate targetUser details if present so socket payload and DB return match
    if (notification.targetUser) {
      await notification.populate('targetUser', 'name email role studentInfo');
    }

    if (isFuture) {
      socketHelper.scheduleNotification(notification);
    } else {
      socketHelper.emitBroadcastNotification(notification);
    }

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/notifications/mine
// @desc    Get user notifications (excluding deleted ones, matching target segment)
// @access  Private
router.get('/mine', protect, async (req, res) => {
  try {
    const now = new Date();
    let userDept = null;
    if (req.user.studentInfo && req.user.studentInfo.department) {
      userDept = req.user.studentInfo.department;
    } else if (req.user.department) {
      userDept = req.user.department;
    }

    const notifications = await Notification.find({
      deletedBy: { $ne: req.user._id },
      $or: [
        { scheduledFor: null },
        { scheduledFor: { $lte: now } }
      ],
      $and: [
        {
          $or: [
            { targetType: 'all' },
            { targetType: { $exists: false } },
            { targetType: 'department', targetDepartment: userDept },
            { targetType: 'student', targetUser: req.user._id }
          ]
        }
      ]
    }).lean();

    notifications.sort((a, b) => {
      const timeA = new Date(a.sentAt || a.scheduledFor || a.createdAt).getTime();
      const timeB = new Date(b.sentAt || b.scheduledFor || b.createdAt).getTime();
      return timeB - timeA;
    });

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
    let userDept = null;
    if (req.user.studentInfo && req.user.studentInfo.department) {
      userDept = req.user.studentInfo.department;
    } else if (req.user.department) {
      userDept = req.user.department;
    }

    await Notification.updateMany(
      {
        deletedBy: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
        $or: [
          { targetType: 'all' },
          { targetType: { $exists: false } },
          { targetType: 'department', targetDepartment: userDept },
          { targetType: 'student', targetUser: req.user._id }
        ]
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
// @desc    Delete (hide) a notification for current user, or delete globally if superadmin
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (req.user.role === 'superadmin') {
      await Notification.findByIdAndDelete(req.params.id);
      socketHelper.cancelScheduledNotification(req.params.id);
      res.json({
        success: true,
        message: 'Notification deleted globally',
      });
    } else {
      if (!notification.deletedBy.includes(req.user._id)) {
        notification.deletedBy.push(req.user._id);
        await notification.save();
      }
      res.json({
        success: true,
        message: 'Notification deleted successfully',
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/notifications/search-students
// @desc    Search students by name, email, or roll number for targeted notifications
// @access  Private/SuperAdmin
router.get('/search-students', protect, authorize('superadmin'), async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.json({ success: true, students: [] });
    }

    const User = require('../models/User');
    const regex = new RegExp(query, 'i');
    const students = await User.find({
      role: 'student',
      name: regex
    }).limit(10).select('_id name email role studentInfo profileImage');

    res.json({
      success: true,
      students
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/notifications/departments
// @desc    Get distinct student departments
// @access  Private/SuperAdmin
router.get('/departments', protect, authorize('superadmin'), async (req, res) => {
  try {
    const User = require('../models/User');
    const departments = await User.distinct('studentInfo.department', {
      role: 'student',
      'studentInfo.department': { $ne: null, $exists: true }
    });
    const cleanDepartments = departments
      .map(d => d ? d.trim() : '')
      .filter(d => d !== '')
      .sort();
    const uniqueDepts = [...new Set(cleanDepartments)];

    res.json({
      success: true,
      departments: uniqueDepts
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
    const notifications = await Notification.find({})
      .populate('targetUser', 'name email role studentInfo')
      .sort({ createdAt: -1 });
    res.json({
      success: true,
      notifications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
