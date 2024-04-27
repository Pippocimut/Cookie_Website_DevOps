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
  },
  cart: {
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true }
      }
    ]
  }
});

module.exports = mongoose.model('User', userSchema);
