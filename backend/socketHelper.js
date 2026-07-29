let ioInstance;

module.exports = {
  setIo: (io) => {
    ioInstance = io;
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
  }
};
