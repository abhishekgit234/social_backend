const Post = require('../models/Post');
const ImageKit = require('imagekit');

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || 'dummy_public',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || 'dummy_private',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/dummy'
});

// @desc    Get all posts (Feed)
// @route   GET /api/posts
// @access  Public (or Private depending on requirements, setting Public here to match global feed)
const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate('userId', 'username')
      .populate('comments.userId', 'username')
      .populate('likes', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments();

    res.status(200).json({
      posts,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a post
// @route   POST /api/posts
// @access  Private
const createPost = async (req, res) => {
  try {
    const { text } = req.body;
    let imageUrl = '';

    // Handle image upload to ImageKit
    if (req.file) {
      try {
        const uploadResponse = await imagekit.upload({
          file: req.file.buffer.toString('base64'),
          fileName: req.file.originalname,
        });
        imageUrl = uploadResponse.url;
      } catch (uploadError) {
        console.error('ImageKit Upload Error:', uploadError);
        return res.status(500).json({ message: 'Image upload failed' });
      }
    } else if (req.body.image) {
      // Fallback if image URL was provided instead of a file
      imageUrl = req.body.image;
    }

    if (!text && !imageUrl) {
      return res.status(400).json({ message: 'Must provide either text or image' });
    }

    const newPost = new Post({
      userId: req.user._id,
      text,
      image: imageUrl
    });

    const savedPost = await newPost.save();
    
    // Populate username before returning
    await savedPost.populate('userId', 'username');

    res.status(201).json(savedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Like or Unlike a post
// @route   PUT /api/posts/:id/like
// @access  Private
const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if post is already liked by this user
    const isLiked = post.likes.includes(req.user._id);

    if (isLiked) {
      // Unlike post
      post.likes = post.likes.filter((likeId) => likeId.toString() !== req.user._id.toString());
    } else {
      // Like post
      post.likes.push(req.user._id);
    }

    await post.save();
    
    // Return updated likes array
    await post.populate('likes', 'username');
    res.status(200).json(post.likes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Comment on a post
// @route   POST /api/posts/:id/comment
// @access  Private
const commentPost = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const newComment = {
      userId: req.user._id,
      username: req.user.username,
      text
    };

    post.comments.push(newComment);
    await post.save();

    res.status(201).json(post.comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPosts,
  createPost,
  likePost,
  commentPost
};
