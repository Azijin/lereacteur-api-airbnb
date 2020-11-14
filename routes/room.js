const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Room = require("../models/Room");
const isAuthenticated = require("../middlewares/isAuthenticated");

router.post("/room/publish", isAuthenticated, async (req, res) => {
  try {
    const { title, description, price, location } = req.fields;
    if (title && description && price && location.lat && location.lng) {
      const user = req.user;
      const newRoom = new Room({
        title: title,
        description: description,
        price: price,
        location: [location.lat, location.lng],
        user: user._id,
        photos: [],
      });
      await newRoom.save();
      res.status(200).json(newRoom);
    } else {
      res.status(400).json({ error: "Missing parameters" });
    }
  } catch (error) {
    res.status.json({ error: error.message });
  }
});

router.get("/rooms", async (req, res) => {
  const rooms = await Room.find().select("-description");
  if (rooms) {
    res.status(200).json(rooms);
  } else {
    res.status(400).json({ error: "Error" });
  }
});

router.get("/rooms/:id", async (req, res) => {
  try {
    const offer = await (await Room.findById(req.params.id)).populate(
      "user.account"
    );
    if (offer) {
      res.status(200).json(offer);
    } else {
      res.status(400).json({ error: "There is no offer matching this id" });
    }
  } catch (error) {
    res.status.json({ error: error.message });
  }
});

module.exports = router;
