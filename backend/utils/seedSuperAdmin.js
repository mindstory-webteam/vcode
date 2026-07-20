// Run with: npm run seed:superadmin
// Creates the first SuperAdmin account using credentials from .env
require('dotenv').config();
const dns = require('dns');
// Same Windows link-local IPv6 DNS workaround as server.js — this is a
// separate entry point so it needs the fix applied here too.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const User = require('../models/User');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    console.error('SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`SuperAdmin already exists: ${email}`);
    process.exit(0);
  }

  const superadmin = await User.create({
    name,
    email,
    password,
    role: 'superadmin',
    status: 'approved',
  });

  console.log('SuperAdmin created successfully:');
  console.log(`  Email: ${superadmin.email}`);
  console.log(`  Password: ${password} (change this after first login)`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});