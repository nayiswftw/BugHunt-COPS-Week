const asyncHandler = require("express-async-handler");
const User = require("../Models/User");
const cloudinary = require("../Cloudinary");

//@description     Get or Search all users
//@route           GET /api/user?search=
//@access          Protected
const allUsers = asyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? {
      $or: [
        { name: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
      ],
    }
    : {};

  const users = await User.find(keyword).select("name email pic");
  res.send(users);
});

//@description     update user details
//@route           PUT /api/user/update
//@access          Protected
const UpdateUser = asyncHandler(async (req, res) => {
  const { name, email, Description, PhoneNo, pic, DOB } = req.body;

  if (req.user._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ 
      message: "Not authorized to update other users' profiles" 
    });
  }

  let Url;
  if (pic) {
    const result = await cloudinary.uploader.upload(pic, {
      folder: "UsersImage",
    });
    Url = result.url;
    // console.log(result);
  }

  let user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        name: name,
        email: email,
        Description: Description,
        PhoneNo: PhoneNo,
        DOB: DOB,
        pic: Url,
      },
    },
    { new: true }
  ).select("-password");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(user);
});

module.exports = { allUsers, UpdateUser };