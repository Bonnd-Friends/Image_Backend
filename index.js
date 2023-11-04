const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const { Image } = require('./models/image_urls');

app.use(express.json());

const imageRoutes = require('./routes/imageRoute');
app.use('/', imageRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
