const dotenv = require("dotenv");

dotenv.config();

const app = require('./app');

const connectDB = require('./config/db');
const PORT = process.env.PORT || 5000;

connectDB().then((isConnected) => {
  if (!isConnected) {
    console.log("MongoDB is not connected. Server will still run.");
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

