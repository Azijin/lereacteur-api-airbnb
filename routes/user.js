const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");

const User = require("../models/User");
const Room = require("../models/Room");
const isAuthenticated = require("../middlewares/isAuthenticated");
const isAuthorized = require("../middlewares/isAuthorized");

router.post("/user/sign_up", async (req, res) => {
  try {
    const {
      email,
      username,
      name,
      firstname,
      description,
      password,
    } = req.fields;
    const userEmail = await User.findOne({ "account.email": email });
    const userUsername = await User.findOne({ "account.username": username });
    if (userEmail) {
      res
        .status(409)
        .json({ error: "There is already an account with this email" });
    } else if (userUsername) {
      res.status(409).json({ error: "This username is not availaible" });
    } else {
      if (email && username && name && password && firstname && description) {
        const salt = uid2(64);
        const hash = SHA256(password + salt).toString(encBase64);
        const token = uid2(64);

        const newUser = new User({
          account: {
            email: email,
            username: username,
            name: name,
            firstname: firstname,
            description: description,
          },
          token: token,
          salt: salt,
          hash: hash,
        });
        await newUser.save();
        res.status(200).json({
          _id: newUser._id,
          token: newUser.token,
          account: newUser.account,
        });
      } else {
        res.status(400).json({ error: "Missing parameters" });
      }
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/user/log_in", async (req, res) => {
  try {
    const { email, password } = req.fields;
    if (email && password) {
      const user = await User.findOne({ "account.email": email });
      if (user) {
        const hashToVerify = SHA256(password + user.salt).toString(encBase64);
        if (user.hash === hashToVerify) {
          res.status(200).json({
            _id: user._id,
            token: user.token,
            email: user.account.email,
            username: user.account.username,
            description: user.account.description,
            name: user.account.name,
            firstname: user.account.firstname,
          });
        } else {
          res.status(400).json({ error: "Unauthorized" });
        }
      } else {
        res.status(400).json({ error: "Unauthorized" });
      }
    } else {
      res.status(400).json({ error: "Missing parameters" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/user/:id", async (req, res) => {
  try {
    if (req.params.id) {
      const user = await User.findById(req.params.id).select(
        "account rooms _id"
      );
      if (user) {
        res.status(200).json(user);
      } else {
        res.status(400).json({ error: "No user found with this id" });
      }
    } else {
      res.status(400).json({ error: "Missing parameters" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/user/rooms/:id", async (req, res) => {
  try {
    if (req.params.id) {
      const user = await User.findById(req.params.id);
      if (user) {
        const rooms = await Room.find({ user: req.params.id });
        if (rooms.length !== 0) {
          res.status(200).json(rooms);
        } else {
          res.status(200).json({ message: "This user has no room" });
        }
      } else {
        res.status(400).json({ error: "No user found with this id" });
      }
    } else {
      res.status(400).json({ error: "Missing parameters" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/user/update", isAuthenticated, async (req, res) => {
  try {
    const { email, username, name, firstname, description } = req.fields;
    if (email || username || name || firstname || description) {
      const user = req.user;
      if (email) {
        const verifyEmail = await User.findOne({ "account.email": email });
        if (verifyEmail) {
          return res.status(400).json({ message: "This is already used" });
        } else {
          user.account.email = email;
        }
      }
      if (username) {
        const verifyUsername = await User.findOne({
          "account.username": username,
        });
        if (verifyUsername) {
          return res
            .status(400)
            .json({ message: "This username is already used" });
        } else {
          user.account.username = username;
        }
      }
      if (name) {
        user.account.name = name;
      }
      if (description) {
        user.account.description = description;
      }
      await user.save();
      res.status(200).json({
        _id: user._id,
        account: user.account,
        rooms: user.rooms,
      });
    } else {
      res.status(400).json({ error: "Missing parameters" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/user/update_password", isAuthenticated, async (req, res) => {
  try {
    const { previousPassword, newPassword } = req.fields;
    if (previousPassword && newPassword) {
      const user = await User.findById(req.user._id);
      const hashToVerify = SHA256(previousPassword + user.salt).toString(
        encBase64
      );
      if (hashToVerify === user.hash) {
        const verifyNewPassword = SHA256(newPassword + user.salt).toString(
          encBase64
        );
        if (verifyNewPassword !== hashToVerify) {
          const newSalt = uid2(64);
          const newHash = SHA256(newPassword + newSalt).toString(encBase64);
          const newToken = uid2(64);

          user.salt = newSalt;
          user.hash = newHash;
          user.token = newToken;
          await user.save();
        } else {
          res.status(400).json({
            error: "Previous password and newpassword must be different",
          });
        }
      } else {
        res.status(400).json({ error: "Wrong previous password" });
      }
    } else {
      res.status(200).json({ error: "Missing parameters" });
    }
  } catch (error) {
    res.status(400).json({ error: error.messsage });
  }
});

router.put(
  "/user/upload_picture/:id",
  isAuthenticated,
  isAuthorized,
  async (req, res) => {
    try {
      if (req.files.picture) {
        const user = req.user;
        const picturePath = req.files.picture.path;
        const userPhoto = {};
        if (!user.account.photo) {
          await cloudinary.uploader.upload(
            picturePath,
            {
              folder: `/airbnb/users/${req.params.id}`,
            },
            async function (error, result) {
              userPhoto.url = result.secure_url;
              userPhoto.picture_id = result.public_id;
            }
          );
          await User.findByIdAndUpdate(user._id, {
            "account.photo": userPhoto,
          });
        } else {
          await cloudinary.uploader.upload(
            picturePath,
            {
              public_id: user.account.photo.picture_id,
            },
            async function (error, result) {
              console.log(error, result);
              userPhoto.url = result.secure_url;
              userPhoto.picture_id = result.public_id;
            }
          );
          await User.findByIdAndUpdate(req.params.id, {
            "account.photo": userPhoto,
          });
        }
        const userUpdated = await User.findById(req.params.id).select(
          "account rooms"
        );
        res.status(200).json(userUpdated);
      } else {
        res.status(400).json({ error: "Missing picture" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.put(
  "/user/delete_picture/:id",
  isAuthenticated,
  isAuthorized,
  async (req, res) => {
    try {
      const user = req.user;
      if (user.account.photo) {
        await cloudinary.uploader.destroy(user.account.photo.picture_id);
        await User.findByIdAndUpdate(user._id, {
          "account.photo": null,
        });
        const userUpdated = await User.findById(user._id).select(
          "account rooms"
        );
        res.status(200).json(userUpdated);
      } else {
        res.status(400).json({ error: "No photo found" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

module.exports = router;
