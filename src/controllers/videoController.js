const Video = require("../models/Video");
const upload = require("../middleware/uploadMiddleware")

exports.uploadVideo = async (req, res) => {
  upload.single("video")(req, res, async (err) => {
    // Check upload error
    if (err) {
      return res.status(400).json({
        message: "Error uploading video",
        error: err.message,
      });
    }


  try {
    const {
      title,
      description,
      videoUrl,
      publicId,
      thumbnailUrl,
      duration,
      uploadedBy,
    } = req.body;

    if (
      !title ||
      !description ||
      !videoUrl ||
      !publicId ||
      !thumbnailUrl ||
      !duration ||
      !uploadedBy
    ) {
      return res.status(400).json({
        message: "Please provide all required fields",
      });
    }

    const video = new Video({
      title,
      description,
      videoUrl,
      publicId,
      thumbnailUrl,
      duration,
      uploadedBy,
    });

    await video.save();
    res.status(201).json({ message: "video uploaded successfully", video });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error uploading video", error: error.message });
  }
};
