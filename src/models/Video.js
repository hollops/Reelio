const mongoose = require("mongoose");

// Kept in step with the frontend's CATEGORIES list. The home page builds one row per
// category, so a value outside this list would simply never be shown to anyone.
const CATEGORIES = [
  "Music",
  "Gaming",
  "Education",
  "Comedy",
  "Tech",
  "Sports",
  "Food",
  "Travel",
];

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    thumbnailPublicId: {
      type: String,
      default: '',
    },
    thumbnailUrl: {
      type: String,
      default: "",
    },
    duration: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      enum: CATEGORIES,
      default: "Education",
    },
    // Counters, not relationships: the home page and every card show these, and nothing
    // needs to know WHICH people viewed or liked. Store the number, keep the query cheap.
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);
const Video = mongoose.model("Video", videoSchema);

module.exports = Video;
