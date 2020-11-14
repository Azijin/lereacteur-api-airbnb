const mongoose = require("mongoose");

const Room = mongoose.model("Room", {
  title: String,
  description: String,
  price: Number,
  location: Array,
  photos: Array,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

module.exports = Room;
