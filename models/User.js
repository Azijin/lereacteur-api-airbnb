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
    photo: Object,
  },
  rooms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Room" }],
  token: String,
  hash: String,
  salt: String,
});
module.exports = User;
