const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['superadmin', 'faculty', 'student'],
      required: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    profileImage: {
      type: String, // path to uploaded profile image
      default: null,
    },

    // ---- Student specific fields ----
    studentInfo: {
      rollNumber: { type: String, trim: true },
      department: { type: String, trim: true },
      course: { type: String, trim: true },
      semester: { type: String, trim: true },
      assignedFaculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
    },

    // ---- Faculty specific fields ----
    facultyInfo: {
      department: { type: String, trim: true },
      designation: { type: String, trim: true },
      employeeId: { type: String, trim: true },
    },

    // Only relevant for students created through the registration flow.
    // Faculty/Superadmin created accounts are 'approved' by default.
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password before saving.
// If `_passwordAlreadyHashed` is set (used when migrating an already-hashed
// password, e.g. from an approved StudentApplication), skip re-hashing.
userSchema.pre('save', async function (next) {
  if (this._passwordAlreadyHashed) {
    this._passwordAlreadyHashed = false;
    return next();
  }
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Never leak password field even if select() forgets to exclude it
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
