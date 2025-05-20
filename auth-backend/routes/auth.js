const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

router.post('/signup', async (req, res) => {
  const { username, password, email } = req.body; // Extract email from request body
  try {
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ message: 'User already exists' });
    user = new User({ username, password, email }); // Include email in user creation
    await user.save();
    res.status(201).json({ message: 'User created' });
  } catch (err) {
    res.status(500).json({ message: 'Error creating user' });
  }
});

router.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ message: 'Logged in', user: req.user });
});

router.get('/logout', (req, res) => {
  req.logout(() => {
    res.json({ message: 'Logged out' });
  });
});

router.get('/me', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ user: null });
    }
    // Fetch the user from the database to ensure you have the latest data
    const user = await User.findById(req.user.id);
    if (!user) {
      // If the user is not found in the database, clear the session and return null
      req.logout(() => {
        res.status(404).json({ user: null, message: 'User not found' });
      });
      return;
    }
    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        googleId: user.googleId
      }
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Google OAuth Routes for Login
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

// Google OAuth Routes for Signup - with state parameter to differentiate from login
router.get('/google/signup',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    // Add state parameter to identify this is a signup request
    state: 'signup'
  })
);

// Common callback handler for both login and signup
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: 'http://localhost:3000/login',
    session: true
  }),
  (req, res) => {
    // Check if this was a signup request using the state parameter
    const isSignup = req.query.state === 'signup';

    // If this was a signup, we can add any signup-specific logic here
    // For now, we'll just redirect to the interview page in both cases
    // res.redirect('http://localhost:3000/interview');
    res.redirect('http://localhost:3000/landing');

  }
);

module.exports = router;