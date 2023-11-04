const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  username: String,
  images:[
    {
      imageUrl:String
    }
  ]
});

const Image = mongoose.model('Image', imageSchema);

module.exports = { Image };
