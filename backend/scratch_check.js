const mongoose = require('mongoose');
const User = require('./models/User');
const ProgressReport = require('./models/ProgressReport');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB');
    const user = await User.findOne({ email: 'ajithmindpixel@gmail.com' });
    if (!user) {
      console.log('User not found');
    } else {
      console.log('User:', JSON.stringify(user, null, 2));
      const report = await ProgressReport.findOne({ student: user._id });
      if (!report) {
        console.log('No ProgressReport found for this user');
      } else {
        console.log('ProgressReport:', JSON.stringify(report, null, 2));
      }
    }
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Connection error:', err);
  });
