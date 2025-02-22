const express = require("express");
const router = express.Router();
const User = require("../Models/User");
var jwt = require("jsonwebtoken");
const { allUsers, UpdateUser } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const JWT_SECRET = process.env.JWT_SECRET;
const cloudinary = require("../Cloudinary");
const bcrypt = require("bcryptjs"); 

router.post("/", async (req, res) => {
  let success = false;
  try {
    const { email, password, name, pic } = req.body;

    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Sorry, a user with this email already exists" });
    }

    let picUrl;
    if (pic) {
      const result = await cloudinary.uploader.upload(pic, {
        folder: "UsersImage",
      });
      picUrl = result.url;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      password: hashedPassword,
      email,
      pic: picUrl || undefined 
    });

    const data = {
      user: {
        id: user._id,
      },
    };

    const authToken = jwt.sign(data, JWT_SECRET);
    success = true;
    res.json({ success, authToken, user });
  } catch (error) {
    res.status(500).send("Some error occurred");
  }
});

router.post("/login", async (req, res) => {
  let success = false;
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ error: "Please try to login with correct credentials" });
    }
    const passwordCompare = await bcrypt.compare(password, user.password);
    if (!passwordCompare) {
      success = false;
      return res
        .status(400)
        .json({ success, error: "Please try to login with correct password" });
    }
    const data = {
      user: {
        id: user.id,
      },
    };
    const authToken = jwt.sign(data, JWT_SECRET);
    success = true;
    res.json({ success, authToken, user });
  } catch (error) {
    res.status(500).send("Internal server error");
  }
});

router.route("/").get(protect, allUsers);

router.route("/update").put(protect, UpdateUser);

module.exports = router;