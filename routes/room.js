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
    const offer = await Room.findById(req.params.id).populate({
      path: "user",
      select: "account _id",
    });
    if (offer) {
      res.status(200).json(offer);
    } else {
      res.status(400).json({ error: "Offer not found" });
    }
  } catch (error) {
    res.status.json({ error: error.message });
  }
});

router.put("/room/update/:id", isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const offer = await Room.findById(req.params.id).populate({
      path: "user",
      select: "-hash -salt",
    });
    if (offer) {
      if (user.token === offer.user.token) {
        const { title, description, price, location } = req.fields;
        if (title || description || price || location || location) {
          if (title) {
            offer.title = title;
          }
          if (description) {
            offer.description = description;
          }
          if (price) {
            offer.price = price;
          }
          if (location) {
            if (location.lat) {
              offer.location.shift();
              offer.location.unshift(location.lat);
            }
            if (location.lng) {
              offer.location.pop();
              offer.location.push(location.lng);
            }
          }
          await offer.save();
          const offerToDisplay = await Room.findById(offer._id).populate({
            path: "user",
            select: "account",
          });
          res.status(200).json(offerToDisplay);
        } else {
          res.status(400).json({ error: "Missing parameters for update" });
        }
      } else {
        res.status("400").json({ error: "Unauthorized" });
      }
    } else {
      res.status(400).json({ error: "Offer not found" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/room/delete/:id", isAuthenticated, async (req, res) => {
  try {
    const offer = await Room.findById(req.params.id).populate({
      path: "user",
      select: "token",
    });
    const user = req.user;
    if (offer) {
      if (offer.user.token === user.token) {
        await offer.delete();
        res.status(200).json({ message: "Room deleted" });
      }
    } else {
      res.status(400).json({ error: "Offer not found" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
