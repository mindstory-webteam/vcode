const Counter = require('../models/Counter');

// Prefix is configurable via .env (PROGRAM_CODE_PREFIX=VC)
const PREFIX = process.env.PROGRAM_CODE_PREFIX || 'VC';

/**
 * Atomically generates the next program code for the current year.
 * Format: <PREFIX>-<YY><4-digit sequence>   ->  VC-260001, VC-260002, ...
 * The counter is per-year, so it restarts at 0001 every January.
 */
async function generateProgramCode(date = new Date()) {
  const yy = String(date.getFullYear()).slice(-2);
  const counter = await Counter.findByIdAndUpdate(
    `programCode:${yy}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${PREFIX}-${yy}${String(counter.seq).padStart(4, '0')}`;
}

module.exports = generateProgramCode;