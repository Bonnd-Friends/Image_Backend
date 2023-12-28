const express = require('express');
const multer = require('multer');
const Jimp = require('jimp');
const path = require('path');

const router = express.Router();
const { Image } = require('../models/image_urls');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './Images/');
  },
  filename: (req, file, cb) => {
    const username = req.params.username;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, username + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.post('/api/images/:username', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload an image.' });
  }

  const username = req.params.username;

  const imageUrl = req.file.filename;
  const { x, y, width, height } = JSON.parse(req.body.croppedImage)
  

  Jimp.read(`./Images/${imageUrl}`, (err, image) => {
    if (err) throw err;
  
    image.crop(parseInt(x), parseInt(y), parseInt(width), parseInt(height))
         .write(`./Images/${imageUrl}`, (err) => {
           if (err) console.error(err);
           else console.log('Image cropped successfully');
         });
  });



  // Check if the user exists and if not present then create one otherwise add to existing 
  Image.findOne({ username })
    .then(user => {
      if (!user) {
        return Image.create({ username, images: [{ imageUrl }] });
      }
      user.images.push({ imageUrl });
      return user.save();
    })
    .then(updatedImage => {
      return res.status(201).json(updatedImage);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).send('Image upload failed.');
    });
});


router.get('/api/images/:username', (req, res) => {
  const username = req.params.username;

  Image.findOne({ username })
    .then(user => {
      if (!user) {
        return res.status(404).send('User not found');
      }
      return res.status(200).json(user.images);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).send('Error fetching images.');
    });
});

const fs = require('fs');

router.delete('/api/images/:username', (req, res) => {
  const username = req.params.username;
  const imageUrl = req.body.imageUrl;

  Image.findOne({ username })
    .then(user => {
      if (!user) {
        return res.status(404).send('User not found');
      }
      console.log(user.images)

      // Find the image object with the specified imageUrl
      let imageToDelete;
      for (let i = 0; i < user.images.length; i++) {
        const image = user.images[i];
        imageToDelete = image.imageUrl;
        user.images.remove(image)
      }
      console.log(imageToDelete)

      if (!imageToDelete) {
        return res.status(404).send('Image not found');
      }
      user.images = user.images.filter(image => image.imageUrl !== imageUrl);
      const imagePath = path.join(__dirname, '..', 'Images', imageToDelete);
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Image deletion failed.');
        }
        user.save()
        console.log(user.images)
        return res.status(200).send(`Successfully Deleted ${imageToDelete}`);
      });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).send('User not found');
    });
});


module.exports = router;