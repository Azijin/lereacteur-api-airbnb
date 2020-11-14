const express = require("express");
const router = express.Router();

const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");

const User = require("../models/User");

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

module.exports = router;
