const mongoose = require("mongoose");
require("dotenv").config();

const mongoURL = process.env.MONGODB_URI;

const connectToMongo = async () => {
  try {
    if (!mongoURL) {
      throw new Error("MONGODB_URI environment variable is not defined");
    }

    await mongoose.connect(mongoURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

const db = mongoose.connection;

db.on("connected", () => {
  console.log("connected to mongodb server");
});
db.on("disconnected", () => {
  console.log("disconnected from mongodb server");
});
db.on("error", (err) => {
  console.log("error while connecting to mongodb", err);
});

module.exports = connectToMongo;