const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getPosts, createPost, likePost, commentPost } = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

router.route('/')
  .get(getPosts)
  .post(protect, upload.single('imageFile'), createPost);

router.put('/:id/like', protect, likePost);
router.post('/:id/comment', protect, commentPost);

module.exports = router;
