const mongoose = require("mongoose");
const Schema = mongoose.Schema;
mongoose.promise = Promise;

// Define userSchema
const userSchema = new Schema({
  firstName: { type: String, unique: false },
  lastName: { type: String, unique: false },
  local: {
    username: { type: String, unique: false, required: false },
    password: { type: String, unique: false, required: false }
  },
  google: {
    googleId: { type: String, required: false }
  },
  photos: []
});

// Create reference to User & export
const User = mongoose.model("User", userSchema);
module.exports = User;
