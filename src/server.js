const dotenv = require("dotenv");
const app = require('./app');

dotenv.config();

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

