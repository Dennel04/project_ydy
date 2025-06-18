const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Tag = require('../models/Tag');
const upload = require('../middleware/cloudinaryUpload');
const postImageUpload = require('../middleware/postImageUpload');
const createPostUpload = require('../middleware/createPostUpload');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');
const formatResponse = require('../utils/formatResponse');
const cloudinary = require('../utils/cloudinary');

// Create post (only authorized user)
router.post('/', auth, createPostUpload, async (req, res) => {
  try {
    const { name, content, isPublished } = req.body;
    let tags = req.body.tags;
    
    // Validate input data
    if (!name || name.trim().length < 3) {
      return res.status(400).json({ message: 'Post name must contain at least 3 characters' });
    }
    
    if (!content || content.trim().length < 10) {
      return res.status(400).json({ message: 'Post content must contain at least 10 characters' });
    }
    
    // Check tags
    let tagIds = [];
    if (tags) {
      // If tags are passed as a string, convert it to an array
      if (typeof tags === 'string') {
        try {
          tags = JSON.parse(tags);
        } catch (e) {
          // If it's a single value, create an array from it
          tags = [tags];
        }
      }
      
      // Get tag IDs and check their existence
      for (const tagId of tags) {
        const tag = await Tag.findById(tagId);
        if (!tag) {
          return res.status(400).json({ message: `Tag with ID ${tagId} not found` });
        }
        tagIds.push(tag._id);
        
        // Increase tag usage counter
        tag.count += 1;
        await tag.save();
      }
    }
    

    // Process uploaded images if they exist
    let mainImageUrl = null;
    let contentImagesUrls = [];
    
    // If uploaded files exist
    if (req.files) {
      // If main image is uploaded
      if (req.files.mainImage && req.files.mainImage.length > 0) {
        mainImageUrl = req.files.mainImage[0].path;
      }
      
      // If additional images are uploaded
      if (req.files.contentImages && req.files.contentImages.length > 0) {
        contentImagesUrls = req.files.contentImages.map(file => file.path);
      }
    }
    
    // If images are passed as URL strings
    if (req.body.mainImage) {
      mainImageUrl = req.body.mainImage;
    }
    
    if (req.body.images && Array.isArray(req.body.images)) {
      contentImagesUrls = req.body.images;
    }
    
    // Create post

    const post = new Post({
      name,
      content,
      tags: tagIds,
      isPublished: isPublished !== undefined ? isPublished : true,
      author: req.user.userId,
      mainImage: mainImageUrl,
      images: contentImagesUrls

    });
    
    await post.save();
    
    // Send post with filled tags
    const populatedPost = await Post.findById(post._id)
      .populate('tags', 'name slug')
      .populate('author', 'username');
    
    res.status(201).json(formatResponse(populatedPost));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error creating post' });
  }
});

// Get all posts (accessible to all)
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'username')
      .populate('tags', 'name slug')
      .sort({ createdAt: -1 });
    res.json(formatResponse(posts));
  } catch (e) {
    res.status(500).json({ message: 'Error getting posts' });
  }
});

// Get all posts of a user
router.get('/user/:userId', async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId })
      .populate('author', 'username')
      .sort({ createdAt: -1 });
    
    res.json(formatResponse(posts));
  } catch (e) {
    res.status(500).json({ message: 'Error getting posts of user' });
  }
});

// Get one post by id
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username')
      .populate('tags', 'name slug');
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Increase view counter
    post.views += 1;
    await post.save();
    
    res.json(formatResponse(post));
  } catch (e) {
    res.status(500).json({ message: 'Error getting post' });
  }
});

// Edit post (only author)
router.put('/:id', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { name, content, tags, isPublished, mainImage, images } = req.body;
    const post = await Post.findById(req.params.id).session(session);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if the current user is the post author
    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'No access to edit post' });
    }
    
    // Update fields
    post.name = name || post.name;
    post.content = content || post.content;
    post.isPublished = isPublished !== undefined ? isPublished : post.isPublished;
    
    // Update images if they are provided
    if (mainImage !== undefined) {
      post.mainImage = mainImage;
    }
    
    if (images !== undefined) {
      post.images = images;
    }
    
    // Process tags if they are provided
    if (tags && Array.isArray(tags)) {
      const oldTagIds = post.tags.map(tag => tag.toString());
      let newTagIds = [];
      
      // Get tag IDs and check their existence
      for (const tagId of tags) {
        const tag = await Tag.findById(tagId).session(session);
        if (!tag) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ message: `Tag with ID ${tagId} not found` });
        }
        newTagIds.push(tag._id.toString());
        
        // If this is a new tag for the post, increase the counter
        if (!oldTagIds.includes(tag._id.toString())) {
          tag.count += 1;
          await tag.save({ session });
        }
      }
      
      // Decrease counters for removed tags
      for (const oldTagId of oldTagIds) {
        if (!newTagIds.includes(oldTagId)) {
          const tag = await Tag.findById(oldTagId).session(session);
          if (tag) {
            tag.count = Math.max(0, tag.count - 1); // Don't go below zero
            await tag.save({ session });
          }
        }
      }
      
      // Update tags in post
      post.tags = tags;
    }
    
    await post.save({ session });
    
    // Commit transaction
    await session.commitTransaction();
    session.endSession();
    
    // Return updated post with filled data
    const updatedPost = await Post.findById(post._id)
      .populate('tags', 'name slug')
      .populate('author', 'username');
    
    res.json(formatResponse(updatedPost));
  } catch (e) {
    // Rollback transaction in case of error
    await session.abortTransaction();
    session.endSession();
    
    console.error(e);
    res.status(500).json({ message: 'Error editing post' });
  }
});

// Delete post (only author)
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if the current user is the post author
    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'No access to delete post' });
    }
    
    // Transactional approach - use mongoose session
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Delete post
      await Post.deleteOne({ _id: post._id }, { session });
      
      // Delete all post comments
      await Comment.deleteMany({ post: post._id }, { session });
      
      // Remove post links from liked_posts and favourite collections of all users
      await User.updateMany(
        { $or: [
          { liked_posts: post._id },
          { favourite: post._id }
        ]},
        { 
          $pull: { 
            liked_posts: post._id,
            favourite: post._id 
          }
        },
        { session }
      );
      
      // Commit transaction
      await session.commitTransaction();
      
      res.json({ message: 'Post and all related data successfully deleted' });
    } catch (error) {
      // Rollback transaction in case of error
      await session.abortTransaction();
      throw error;
    } finally {
      // End session
      session.endSession();
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error deleting post' });
  }
});

// Like/unlike post
router.post('/like/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const user = await User.findById(req.user.userId);
    
    // Check if the user has already liked the post
    const index = user.liked_posts.findIndex(postId => 
      postId.toString() === post._id.toString()
    );
    
    if (index === -1) {
      // Like not found - add
      user.liked_posts.push(post._id);
      post.likes += 1;
      await user.save();
      await post.save();
      return res.json({ message: 'Like added', likes: post.likes });
    } else {
      // Like found - remove
      user.liked_posts.splice(index, 1);
      post.likes = Math.max(0, post.likes - 1); // Protection against negative likes
      await user.save();
      await post.save();
      return res.json({ message: 'Like removed', likes: post.likes });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error processing like' });
  }
});

// Check if user liked the post
router.get('/isliked/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    const isLiked = user.liked_posts.some(postId => 
      postId.toString() === req.params.id
    );
    
    res.json({ isLiked });
  } catch (e) {
    res.status(500).json({ message: 'Error checking like' });
  }
});

// Add/remove post from favourites
router.post('/favourite/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const user = await User.findById(req.user.userId);
    
    // Check if the post is already in favourites
    const index = user.favourite.findIndex(postId => 
      postId.toString() === post._id.toString()
    );
    
    if (index === -1) {
      // Post not in favourites - add
      user.favourite.push(post._id);
      await user.save();
      return res.json({ message: 'Post added to favourites', inFavourite: true });
    } else {
      // Post already in favourites - remove
      user.favourite.splice(index, 1);
      await user.save();
      return res.json({ message: 'Post removed from favourites', inFavourite: false });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error processing favourites' });
  }
});

// Check if post is in favourites of a user
router.get('/isfavourite/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    const isFavourite = user.favourite.some(postId => 
      postId.toString() === req.params.id
    );
    
    res.json({ isFavourite });
  } catch (e) {
    res.status(500).json({ message: 'Error checking favourites' });
  }
});

// Get all favourite posts of a user
router.get('/favourites', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate({
      path: 'favourite',
      populate: { path: 'author', select: 'username' }
    });
    
    res.json(user.favourite);
  } catch (e) {
    res.status(500).json({ message: 'Error getting favourite posts' });
  }
});

// Search and filter posts
router.get('/search', async (req, res) => {
  try {
    const { 
      query, // search query
      tag,   // tag filter
      author,// author filter
      sort,  // sorting: date, views, likes
      limit = 10,  // number of posts per page
      page = 1     // page number
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter
    const filter = { isPublished: true };
    
    // Search by text
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } }
      ];
    }
    
    // Tag filter
    if (tag) {
      filter.tags = tag;
    }
    
    // Author filter
    if (author) {
      filter.author = author;
    }
    
    // Define sorting
    let sortOption = { createdAt: -1 }; // default - first new
    
    if (sort === 'views') {
      sortOption = { views: -1 };
    } else if (sort === 'likes') {
      sortOption = { likes: -1 };
    } else if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    }
    
    // Get total number of posts
    const total = await Post.countDocuments(filter);
    
    // Get posts with pagination
    const posts = await Post.find(filter)
      .populate('author', 'username')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));
    
    res.json({
      posts: formatResponse(posts),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error searching posts' });
  }
});

// Upload main image for post
router.post('/upload-main-image/:id', auth, postImageUpload.single('image'), async (req, res, next) => {
  try {
    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'File not uploaded' });
    }

    // Find post in database
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if the current user is the post author
    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'No access to edit post' });
    }
    
    // If the post already has a main image, delete it from Cloudinary
    if (post.mainImage) {
      try {
        // Extract public_id from URL
        const publicId = post.mainImage.split('/').pop().split('.')[0];
        // Define folder based on URL
        const folder = post.mainImage.includes('blog-post-images') ? 'blog-post-images' : 'blog-uploads';
        // Delete old image
        await cloudinary.uploader.destroy(`${folder}/${publicId}`);
      } catch (error) {
        console.log('Error deleting old main image of post:', error);
        // Continue working even in case of error
      }
    }
    
    // Cloudinary returns full URL in req.file.path
    const imageUrl = req.file.path;
    
    // Save main image URL in post
    post.mainImage = imageUrl;
    await post.save();
    
    res.json({ 
      message: 'Main image successfully uploaded', 

      imageUrl
    });
  } catch (e) {
    console.error(e);
    next(e); // Pass error to global handler
  }
});

// Upload additional image for post
router.post('/upload-content-image/:id', auth, postImageUpload.single('image'), async (req, res, next) => {
  try {
    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'File not uploaded' });
    }

    // Find post in database
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if the current user is the post author
    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'No access to edit post' });
    }
    
    // Cloudinary returns full URL in req.file.path
    const imageUrl = req.file.path;
    
    // Add image URL to array
    if (!post.images) {
      post.images = [];
    }
    post.images.push(imageUrl);
    await post.save();
    
    res.json({ 
      message: 'Content image successfully uploaded', 
      imageUrl
    });
  } catch (e) {
    console.error(e);
    next(e); // Pass error to global handler
  }
});


// Remove image from post content
router.delete('/delete-content-image/:id', auth, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL not specified' });
    }
    
    // Find post in database
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if the current user is the post author
    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'No access to edit post' });
    }
    
    // Check if image exists in array
    if (!post.images || !post.images.includes(imageUrl)) {
      return res.status(404).json({ message: 'Image not found in post' });
    }
    
    // Delete image from Cloudinary
    try {
      // Extract public_id from URL
      const publicId = imageUrl.split('/').pop().split('.')[0];
      // Define folder based on URL
      const folder = imageUrl.includes('blog-post-images') ? 'blog-post-images' : 'blog-uploads';
      // Delete image
      await cloudinary.uploader.destroy(`${folder}/${publicId}`);
    } catch (error) {
      console.log('Error deleting image from Cloudinary:', error);
      // Continue working even in case of error
    }
    
    // Remove URL from array
    post.images = post.images.filter(img => img !== imageUrl);
    await post.save();
    
    res.json({ 
      message: 'Image successfully deleted', 
      images: post.images
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error deleting image' });
  }
});

// Remove main image of post
router.delete('/delete-main-image/:id', auth, async (req, res) => {
  try {
    // Find post in database
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if the current user is the post author
    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'No access to edit post' });
    }
    
    // Check if the post has a main image
    if (!post.mainImage) {
      return res.status(400).json({ message: 'Post has no main image' });
    }
    
    // Delete image from Cloudinary
    try {
      const publicId = post.mainImage.split('/').pop().split('.')[0];
      const folder = post.mainImage.includes('blog-post-images') ? 'blog-post-images' : 'blog-uploads';
      await cloudinary.uploader.destroy(`${folder}/${publicId}`);
    } catch (error) {
      console.log('Error deleting main image from Cloudinary:', error);
    }
    
    // Remove main image URL from post
    post.mainImage = null;
    await post.save();
    
    res.json({ 
      message: 'Main image successfully deleted'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error deleting main image' });
  }
});

// Get posts by tag
router.get('/bytag/:tagId', async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.tagId);
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }
    
    const posts = await Post.find({ 
      tags: req.params.tagId,
      isPublished: true 
    })
    .populate('author', 'username')
    .populate('tags', 'name slug')
    .sort({ createdAt: -1 });
    
    res.json(posts);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error getting posts by tag' });
  }
});

module.exports = router; 