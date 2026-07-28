const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const user = await User.findById("6a682b79688eff81b825810a");
    console.log('User Record:', JSON.stringify(user, null, 2));
    mongoose.connection.close();
  })
  .catch(err => {
    console.error(err);
  });
