require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');

const app = express();

mongoose.connect(process.env.MONGO_URI);

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

require('./config/passport')(passport);

app.use('/auth', require('./routes/auth'));
app.use('/session-report', require('./routes/sessionReport'));

app.listen(4000, () => console.log('Auth server running on http://localhost:4000'));