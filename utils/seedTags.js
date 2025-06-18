const mongoose = require('mongoose');
const Tag = require('../models/Tag');
require('dotenv').config();

// Function to create a slug from a name
const createSlug = (name) => {
  return name.toLowerCase()
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/[^\w-]+/g, '')  // Remove non-word characters and non-hyphens
    .replace(/--+/g, '-')     // Replace multiple hyphens with a single one
    .replace(/^-+/, '')       // Remove hyphens at the start
    .replace(/-+$/, '');      // Remove hyphens at the end
};

// List of predefined tags with descriptions
const tagsList = [
  { name: 'Nature', description: 'Environment, plants, animals, and natural world topics' },
  { name: 'Games', description: 'Video games, board games, gaming industry and game development' },
  { name: 'Design', description: 'Graphic design, UX/UI, web design and visual principles' },
  { name: 'Programming', description: 'Coding, software development and technical solutions' },
  { name: 'News', description: 'Current events, breaking news and informational content' },
  { name: 'Education', description: 'Learning resources, courses, and educational materials' },
  { name: 'Creativity', description: 'Creative arts, self-expression, and innovative ideas' },
  { name: 'Entertainment', description: 'Movies, TV shows, media and popular culture' },
  { name: 'Technology', description: 'Technology trends, gadgets, innovations and digital advances' }
];

// Function to seed the database with tags
const seedTags = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('MongoDB connected for seeding tags');
    
    // Remove existing tags if any
    await Tag.deleteMany({});
    console.log('Existing tags cleared');
    
    // Transform the tag list by adding slugs
    const tagsWithSlugs = tagsList.map(tag => ({
      ...tag,
      slug: createSlug(tag.name)
    }));
    
    // Add tags to the database
    await Tag.insertMany(tagsWithSlugs);
    console.log(`${tagsWithSlugs.length} tags successfully added to the database`);
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding tags:', error);
    process.exit(1);
  }
};

// Run the seed function
seedTags(); 