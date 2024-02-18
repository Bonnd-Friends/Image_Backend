const express = require('express');
const multer = require('multer');
const Jimp = require('jimp');
const aws = require('aws-sdk');
const { Image } = require('../models/image_urls');

const router = express.Router();
// aws configurations
aws.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'ap-south-1',
});

const s3 = new aws.S3();

// used multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/api/images/:username', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image.' });
    }

    const username = req.body.username;
    const randomIdentifier = Date.now() + Math.round(Math.random() * 1E9);
    const fileExtension = req.file.originalname.split('.').pop();

    const imageUrl = `${randomIdentifier}.${fileExtension}`;
    const { x, y, width, height } = JSON.parse(req.body.croppedImage);

    const image = await Jimp.read(req.file.buffer);
    image.crop(parseInt(x), parseInt(y), parseInt(width), parseInt(height));
    
    const croppedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

    const uploadParams = {
      Bucket: 'bonnd-images', // Bucker Name
      Key: `Images/${username}/${imageUrl}`,
      Body: croppedBuffer,
    };

    await s3.upload(uploadParams).promise();

    const user = await Image.findOne({ username });
    if (!user) {
      await Image.create({ username, images: [{ imageUrl }] });
    } else {
      user.images.push({ imageUrl });
      await user.save();
    }

    return res.status(200).json({ imageUrl });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Image upload failed.');
  }
});

router.get('/api/images/:username', async (req, res) => {
  try {
    const { username } = req.body;

    const user = await Image.findOne({ username });

    if (!user) {
      return res.status(404).send('User not found');
    }

    const imageUrls = user.images.map(image => {
      const imageUrl = image.imageUrl;
      return `https://bonnd-images.s3.ap-south-1.amazonaws.com/Images/${username}/${imageUrl}`;
    });

    return res.status(200).json({ imageUrls });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Error fetching images.');
  }
});

router.delete('/api/images/:username', async (req, res) => {
  try {
    const { username,imageUrl } = req.body;

    const user = await Image.findOne({ username });

    if (!user) {
      return res.status(404).send('User not found');
    }

    const imageToDelete = user.images.find(image => image.imageUrl === imageUrl);

    if (!imageToDelete) {
      return res.status(404).send('Image not found');
    }

    const deleteParams = {
      Bucket: 'bonnd-images',
      Key: `Images/${username}/${imageUrl}`,
    };

    await s3.deleteObject(deleteParams).promise();

    user.images.pull(imageToDelete);

    await user.save();

    return res.status(200).send(`Successfully Deleted ${imageUrl}`);
  } catch (error) {
    console.error(error);
    return res.status(500).send('Image deletion failed.');
  }
});
router.get('/image/:filename', (req, res) => {
  const filename = req.params.filename;

  if (/^[a-zA-Z0-9-.]+$/.test(filename)) {
    const imagePath = `Images/${filename}`;

    const imageStream = s3.getObject({
      Bucket: 'bonnd-images',
      Key: imagePath,
    }).createReadStream();

    imageStream.on('error', (err) => {
      console.error(err);
      const placeholderPath = path.join(__dirname, '../Images', 'demo.png');
      const placeholderStream = fs.createReadStream(placeholderPath);
      placeholderStream.pipe(res);
    });

    imageStream.pipe(res);
  } else {
    res.status(400).send('Invalid filename');
  }
});

module.exports = router;
