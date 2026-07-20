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

connectDB();

const app = express();


app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});
// ---- Global middleware ----
app.use(helmet({ crossOriginResourcePolicy: false })); // allow serving uploaded files cross-origin
app.use(
  cors({
    origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : '*',
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

// ---- Error handling ----
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
