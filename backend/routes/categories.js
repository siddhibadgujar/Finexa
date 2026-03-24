const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// @route   GET /api/categories
// @desc    Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching categories' });
  }
});

// @route   POST /api/categories/add
// @desc    Add a new category
router.post('/add', async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) {
      return res.status(400).json({ message: 'Please provide name and type' });
    }

    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const newCategory = new Category({ name, type });
    const savedCategory = await newCategory.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error saving category' });
  }
});

// Initial seed function (internal use)
router.post('/seed', async (req, res) => {
  const initialCategories = [
    { name: 'product sales', type: 'income' },
    { name: 'service income', type: 'income' },
    { name: 'bulk orders', type: 'income' },
    { name: 'rent', type: 'expense' },
    { name: 'salary', type: 'expense' },
    { name: 'transport', type: 'expense' },
    { name: 'raw materials', type: 'expense' },
    { name: 'utilities', type: 'expense' },
    { name: 'marketing', type: 'expense' }
  ];

  try {
    await Category.deleteMany({}); // Optional: clear existing if needed for clean seed
    const seeded = await Category.insertMany(initialCategories);
    res.json({ message: 'Categories seeded', count: seeded.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error seeding categories' });
  }
});

module.exports = router;
