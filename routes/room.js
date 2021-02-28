const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;

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
  try {
    const filters = {};
    if (req.query.title) {
      filters.title = new RegExp(req.query.title, "i");
    }
    if (req.query.priceMin) {
      filters.price = { $gte: req.query.priceMin };
    }
    if (req.query.priceMax) {
      if (filters.price) {
        filters.price.$lte = req.query.priceMax;
      } else {
        filters.price = { $lte: req.query.priceMax };
      }
    }
    let sort = {};
    if (req.query.sort) {
      if (req.query.sort === "price-asc") {
        sort.price = 1;
      } else if (req.query.sort === "price-desc") {
        sort.price = -1;
      }
    }
    const count = await Room.countDocuments(filters);
    const search = Room.find(filters, { description: false })
      .populate({
        path: "user",
        select: "account",
      })
      .sort(sort);
    if (req.query.page) {
      const page = Number(req.query.page);
      const limit = Number(req.query.limit);
      search.limit(limit).skip(limit * (page - 1));
    }
    const rooms = await search;
    res.status(200).json({ count: count, rooms: rooms });
  } catch (error) {
    res.status(400).json({ error: error.message });
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
        const roomToDisplay = await Room.findById(room._id);
        res.status(200).json(roomToDisplay);
      } else {
        res.status(400).json({ error: "Missing parameters for update" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.put(
  "/room/upload_picture/:id",
  isAuthenticated,
  isAuthorized,
  async (req, res) => {
    try {
      if (req.files.picture) {
        const room = req.room;
        const photosRoom = room.photos;
        if (photosRoom.length < 5) {
          const photo = req.files.picture.path;
          const user = req.user;
          await cloudinary.uploader.upload(
            photo,
            {
              folder: `airbnb/users/${user._id}/rooms/${room._id}`,
            },
            async function (error, result) {
              const newPhoto = {
                url: result.secure_url,
                picture_id: result.public_id,
              };
              photosRoom.push(newPhoto);
            }
          );
          await Room.findByIdAndUpdate(room._id, {
            photos: photosRoom,
          });
          const roomUpdated = await Room.findById(room._id);
          res.status(200).json(roomUpdated);
        } else {
          res.status(400).json({ error: "Can't add more than 5 pictures" });
        }
      } else {
        res.status(400).json({ error: "Missing picture" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.put(
  "/room/delete_picture/:id",
  isAuthenticated,
  isAuthorized,
  async (req, res) => {
    try {
      if (req.fields.picture_id) {
        const room = req.room;
        const photosRoom = room.photos;
        const picture_id = req.fields.picture_id;
        let isPhoto = false;
        for (let i = 0; i < photosRoom.length; i++) {
          if (photosRoom[i].picture_id === picture_id) {
            isPhoto = true;
          }
        }
        if (!isPhoto) {
          res.status(400).json({ error: "Picture not found" });
        } else {
          for (let j = 0; j < photosRoom.length; j++) {
            if (photosRoom[j].picture_id === picture_id) {
              const index = photosRoom.indexOf(photosRoom[j]);
              photosRoom.slice(index, 1);
              await cloudinary.uploader.destroy(picture_id);
              await Room.findByIdAndUpdate(room._id, { photos: photosRoom });
            }
          }
          res.status(200).json({ message: "Picture deleted" });
        }
      } else {
        res.status(400).json({ error: "Missing picture id" });
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
