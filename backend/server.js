require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Routes
const authRoutes = require('./routes/authRoutes');
const superadminRoutes = require('./routes/superadminRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const studentRoutes = require('./routes/studentRoutes');
const publicRoutes = require('./routes/publicRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

connectDB();

const app = express();

// ---- Global middleware ----
app.use(helmet({ crossOriginResourcePolicy: false }));
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((u) => u.trim().replace(/\/$/, ''))
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like Postman or server-to-server)
      if (!origin) return callback(null, true);

      // Always allow localhost / 127.0.0.1 on any port
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Always allow Netlify domains
      if (origin.endsWith('.netlify.app')) {
        return callback(null, true);
      }

      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Serve uploaded files (documents & profile images) statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---- Health check ----
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Progress Report API is running' });
});

// ---- Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/notifications', notificationRoutes);

// ---- Error handling ----
app.use(notFound);
app.use(errorHandler);

const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  },
});

const socketHelper = require('./socketHelper');

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  socket.on('join_application_room', (email) => {
    if (email) {
      const room = `application:${email.toLowerCase().trim()}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    }
  });

  socket.on('join_progress_report_room', (studentId) => {
    if (studentId) {
      const room = `progress_report:${studentId.toString()}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    }
  });

  socket.on('join_notification_rooms', ({ userId, department }) => {
    if (userId) {
      const userRoom = `user:${userId.toString()}`;
      socket.join(userRoom);
      console.log(`Socket ${socket.id} joined room ${userRoom}`);
    }
    if (department) {
      const deptRoom = `department:${department.toLowerCase().trim()}`;
      socket.join(deptRoom);
      console.log(`Socket ${socket.id} joined room ${deptRoom}`);
    }
  });
});

socketHelper.setIo(io);
app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
