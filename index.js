const express = require('express');
var cors = require('cors')
const app = express();
const port = process.env.PORT || 5000;
const mongoose = require('mongoose');
const bodyParser = require("body-parser");
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then((result) => {
  console.log("connected");
})
  .catch((err) => console.log(err));

const { Image } = require('./models/image_urls');

app.use(cors({origin: 'http://localhost:5173',credentials: true}));
// app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.raw({ type: 'image/*', limit: '10mb' }));

const imageRoutes = require('./routes/imageRoute');
app.use('/', imageRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
