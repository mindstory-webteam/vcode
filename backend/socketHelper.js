const Notification = require('./models/Notification');
let ioInstance;
const activeTimers = new Map();

const emitNotification = (notification) => {
  if (!ioInstance || !notification) return;

  const targetType = notification.targetType || 'all';
  if (targetType === 'student' && notification.targetUser) {
    const room = `user:${notification.targetUser.toString()}`;
    ioInstance.to(room).emit('new_notification', notification);
    console.log(`[Socket] Emitted targeted notification to ${room}`);
  } else if (targetType === 'department' && notification.targetDepartment) {
    const room = `department:${notification.targetDepartment.toLowerCase().trim()}`;
    ioInstance.to(room).emit('new_notification', notification);
    console.log(`[Socket] Emitted targeted notification to ${room}`);
  } else {
    ioInstance.emit('new_notification', notification);
    console.log('[Socket] Broadcasted notification to all');
  }
};

const scheduleNotification = (notification) => {
  if (!ioInstance || !notification.scheduledFor) return;

  const delay = new Date(notification.scheduledFor).getTime() - Date.now();
  if (delay <= 0) return;

  const timerId = notification._id.toString();
  if (activeTimers.has(timerId)) {
    clearTimeout(activeTimers.get(timerId));
  }

  const timer = setTimeout(async () => {
    try {
      const freshNotif = await Notification.findById(notification._id);
      if (freshNotif) {
        emitNotification(freshNotif);
      }
    } catch (err) {
      console.error('[Scheduler] Error emitting scheduled notification:', err);
    } finally {
      activeTimers.delete(timerId);
    }
  }, delay);

  activeTimers.set(timerId, timer);
  console.log(`[Scheduler] Scheduled notification "${notification.title}" in ${delay}ms`);
};

module.exports = {
  setIo: (io) => {
    ioInstance = io;
    // Load and schedule future notifications on boot
    const now = new Date();
    Notification.find({
      scheduledFor: { $gt: now }
    }).then(futureNotifications => {
      futureNotifications.forEach(notif => {
        scheduleNotification(notif);
      });
      console.log(`[Scheduler] Initialized. Scheduled ${futureNotifications.length} future notifications.`);
    }).catch(err => {
      console.error('[Scheduler] Failed to load scheduled notifications:', err);
    });
  },
  getIo: () => ioInstance,
  emitProgressUpdate: (studentId) => {
    if (ioInstance && studentId) {
      ioInstance.to(`progress_report:${studentId.toString()}`).emit('progress_report_updated');
    }
  },
  emitUserDeactivated: (userId) => {
    if (ioInstance && userId) {
      ioInstance.to(`progress_report:${userId.toString()}`).emit('user_deactivated');
    }
  },
  emitUserDeleted: (userId) => {
    if (ioInstance && userId) {
      ioInstance.to(`progress_report:${userId.toString()}`).emit('user_deleted');
    }
  },
  emitBroadcastNotification: emitNotification,
  scheduleNotification,
  cancelScheduledNotification: (id) => {
    const timerId = id.toString();
    if (activeTimers.has(timerId)) {
      clearTimeout(activeTimers.get(timerId));
      activeTimers.delete(timerId);
      console.log(`[Scheduler] Cancelled scheduled notification: ${timerId}`);
    }
  }
};
