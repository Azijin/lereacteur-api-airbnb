const mongoose = require("mongoose");

const User = mongoose.model("User", {
  account: {
    username: {
      required: true,
      type: String,
      unique: true,
    },
    email: {
      unique: true,
      type: String,
      required: true,
    },
    name: {
      required: true,
      type: String,
    },
    firstname: {
      required: true,
      type: String,
    },
    description: String,
  },
  token: String,
  hash: String,
  salt: String,
});
module.exports = User;
