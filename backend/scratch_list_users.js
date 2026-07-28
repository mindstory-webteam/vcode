const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    const users = await User.find({});
    console.log('Users in DB:');
    users.forEach(u => {
      console.log(`- Email: ${u.email}, ID: ${u._id}, Role: ${u.role}, Status: ${u.status}`);
    });
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Connection error:', err);
  });
