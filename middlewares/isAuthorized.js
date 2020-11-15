const User = require("../models/User");
const Room = require("../models/Room");

const isAuthorized = async (req, res, next) => {
  try {
    if (req.params.id) {
      const user = req.user;
      const room = await Room.findById(req.params.id);
      if (room) {
        if (String(user._id) === String(room.user)) {
          req.room = room;
          return next();
        } else {
          return res.status(400).json({ error: "Unauthorized" });
        }
      } else {
        return res.status(400).json({ error: "There is no room with this id" });
      }
    } else {
      return res.status(400).json({ error: "Missing room id" });
    }
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
module.exports = isAuthorized;
