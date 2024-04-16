const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  active: {
    type: Boolean,
    default: false
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  resetToken: String,
  resetTokenExpiration: Date,
  emailVeriificationToken:{
    type: String,
    default: null
  },
  emailVerificationTokenExpiration: Date,
  role: {
    type: String,
    default: 'user'
  }
});

module.exports = mongoose.model('User', userSchema);
