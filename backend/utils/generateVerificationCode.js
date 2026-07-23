const Counter = require('../models/Counter');

// Atomically increments a global counter and returns 'VC-000001', 'VC-000002', ...
async function generateVerificationCode() {
  const counter = await Counter.findByIdAndUpdate(
    'verificationCode',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const padded = String(counter.seq).padStart(6, '0');
  return `VC-${padded}`;
}

module.exports = generateVerificationCode;