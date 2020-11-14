const express = require("express");
const formidable = require("express-formidable");
const cors = require("cors");
const mongoose = require("mongoose");
mongoose.set("debug", true);

require("dotenv").config();

const app = express();
app.use(formidable());
app.use(cors());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false,
});

const userRoutes = require("./routes/user");
app.use(userRoutes);
const roomRoutes = require("./routes/room");
app.use(roomRoutes);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to the airbnb api" });
});

app.all("*", (req, res) => {
  res.status(404).json({ error: "Page not found" });
});
app.listen(process.env.PORT, () => {
  console.log("Server started");
});
