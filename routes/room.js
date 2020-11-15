const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Room = require("../models/Room");
const isAuthenticated = require("../middlewares/isAuthenticated");
const isAuthorized = require("../middlewares/isAuthorized");

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
      const userRooms = user.rooms;
      userRooms.push(newRoom._id);
      await User.findByIdAndUpdate(user._id, { rooms: userRooms });
      res.status(200).json(newRoom);
    } else {
      res.status(400).json({ error: "Missing parameters" });
    }
  } catch (error) {
    res.status.json({ error: error.message });
  }
});

router.get("/rooms", async (req, res) => {
  const rooms = await Room.find().select("-description").polulate({
    path: "user",
    select: "account",
  });
  if (rooms) {
    res.status(200).json(rooms);
  } else {
    res.status(400).json({ error: "Error" });
  }
});

router.get("/rooms/:id", async (req, res) => {
  if (req.params.id) {
    try {
      const room = await Room.findById(req.params.id).populate({
        path: "user",
        select: "account",
      });
      if (room) {
        res.status(200).json(room);
      } else {
        res.status(400).json({ error: "Room not found" });
      }
    } catch (error) {
      res.status.json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: "Missing room id" });
  }
});

router.put(
  "/room/update/:id",
  isAuthenticated,
  isAuthorized,
  async (req, res) => {
    try {
      const { title, description, price, location } = req.fields;
      const room = req.room;
      if (title || description || price || location) {
        if (title) {
          room.title = title;
        }
        if (description) {
          room.description = description;
        }
        if (price) {
          room.price = price;
        }
        if (location) {
          if (location.lat) {
            room.location.shift();
            room.location.unshift(location.lat);
          }
          if (location.lng) {
            room.location.pop();
            room.location.push(location.lng);
          }
        }
        await room.save();
        /*const roomToDisplay = await Room.findById(room._id).populate({
          path: "user",
          select: "account",
        });*/
        res.status(200).json(room);
      } else {
        res.status(400).json({ error: "Missing parameters for update" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.delete(
  "/room/delete/:id",
  isAuthenticated,
  isAuthorized,
  async (req, res) => {
    try {
      const room = req.room;
      await room.delete();
      const user = req.user;
      const userRooms = user.rooms;
      const indexRoom = userRooms.indexOf(room._id);
      userRooms.splice(indexRoom, 1);
      await User.findByIdAndUpdate(user._id, { rooms: userRooms });
      res.status(200).json({ message: "Room deleted" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

module.exports = router;
