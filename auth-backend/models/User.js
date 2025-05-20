const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    unique: true,
    required: true
  },
  password: String,
  email: { // Make email required for standard signup
    type: String,
    required: function() {
      return !this.googleId; // Only required if not a Google user
    }
  },
  // New fields for Google OAuth
  googleId: { 
    type: String, 
    sparse: true, 
    unique: true 
  },
  displayName: String,
  // Additional fields you might want
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Only hash the password if it exists and was modified
UserSchema.pre('save', async function(next) {
  // Skip if password isn't modified or if it's empty (Google users may not have a password)
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password safely - handles case where user might not have a password (Google auth)
UserSchema.methods.comparePassword = async function(candidatePassword) {
  // If no password exists (Google user), password comparison should fail
  if (!this.password) return false;
  
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);