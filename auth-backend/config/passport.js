const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = function(passport) {
  // Local Strategy for username/password login
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await User.findOne({ username });
      if (!user) return done(null, false, { message: 'Incorrect username.' });
      
      const isMatch = await user.comparePassword(password);
      if (!isMatch) return done(null, false, { message: 'Incorrect password.' });
      
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  // Google OAuth Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:4000/auth/google/callback",
    proxy: true,
    passReqToCallback: true // Add this line
  }, async (req, accessToken, refreshToken, profile, cb) => { // Add req as the first argument
    try {
      // Extract request details from the callback
      const { state } = req.query;
      const isSignup = state === 'signup';
      
      // First check if user already exists with this Google ID
      let user = await User.findOne({ googleId: profile.id });
      
      // If user exists and this is a signup attempt, we could handle this differently
      if (user && isSignup) {
        // User already exists with this Google account
        // For now we'll just use the existing account, but you could:
        // 1. Notify the user that this account already exists
        // 2. Redirect them to login instead
        // 3. Or handle it according to your application's needs
        return cb(null, user);
      }
      
      if (!user) {
        // If not found by googleId, try to find by email to link accounts
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        
        if (email) {
          user = await User.findOne({ email });
          
          // If this is a signup attempt and we found a user with the same email
          if (user && isSignup) {
            // You might want to handle this case differently
            // For now, we'll link the Google ID to the existing account
            user.googleId = profile.id;
            if (!user.displayName) user.displayName = profile.displayName || '';
            await user.save();
            return cb(null, user);
          }
        }
        
        // If still no user, create a new one
        if (!user) {
          // Create username from email or Google ID
          const username = email ? email.split('@')[0] : `google_${profile.id}`;
          
          // Check if username already exists
          const existingUser = await User.findOne({ username });
          const finalUsername = existingUser ? `${username}_${Date.now().toString().slice(-4)}` : username;
          
          user = new User({
            username: finalUsername,
            googleId: profile.id,
            displayName: profile.displayName || '',
            email: email
            // Password remains empty for Google auth users
          });
        } else {
          // Link existing account with Google
          user.googleId = profile.id;
          if (!user.displayName) user.displayName = profile.displayName || '';
        }
        
        await user.save();
      }
      
      return cb(null, user);
    } catch (err) {
      return cb(err);
    }
  }));

  // Session handling
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};