const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Business = require('../models/Business');

// @route   GET /api/user/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const business = await Business.findOne({ userId: req.user.id });

    res.json({
      name: user.name,
      email: user.email,
      businessName: business ? business.businessName : 'No Business Setup',
      businessType: business ? business.businessType : 'N/A',
      role: user.role || 'Admin',
      language: user.language || 'en'
    });
  } catch (err) {
    console.error("Profile Fetch Error:", err.message);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// @route   PUT /api/user/update
// @desc    Update user profile & business details
// @access  Private

router.put('/update', protect, async (req, res) => {
  const { name, businessName, businessType, language } = req.body;

  try {
    // 1. Update User
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (language) user.language = language;
    await user.save();

    // 2. Update Business
    let business = await Business.findOne({ userId: req.user.id });
    if (business) {
        if (businessName) business.businessName = businessName;
        if (businessType) business.businessType = businessType;
        await business.save();
    }

    res.json({ 
        message: 'Profile updated successfully',
        user: {
            name: user.name,
            email: user.email,
            language: user.language,
            businessName: business?.businessName,
            businessType: business?.businessType
        }
    });
  } catch (err) {
    console.error("Update Profile Error:", err.message);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

module.exports = router;
