const mongoose = require("mongoose");
const { Schema } = mongoose;
const chatModel = new Schema(
  {
    chatName: { type: String, trim: true },
    isGroupChat: { type: Boolean, default: false },
    users: [{ 
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }],
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message"
    },
    groupAdmin: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    pic: {
      type: String,
      default:
        "https://static.vecteezy.com/system/resources/previews/000/550/535/original/user-icon-vector.jpg",
    },
  },
  { timestamps: true }
);

chatModel.index({ users: 1 });
chatModel.index({ createdAt: -1 });
chatModel.index({ chatName: 1, isGroupChat: 1 }, { unique: true });

const Chat = mongoose.model("Chat", chatModel);
module.exports = Chat;