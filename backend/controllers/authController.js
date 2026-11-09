
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';

// Generate JWT
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

// Register
export const register = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'Username or email already exists.'
      });
    }

    // Password will automatically be hashed by User.js
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage
      }
    });

  } catch (error) {
    console.error('Register error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Username or email already exists.'
      });
    }

    return res.status(500).json({
      message: 'Registration failed. Please try again.'
    });
  }
};


// Login
export const login = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Password is excluded by default in User.js
    const user = await User.findOne({
      email: email.toLowerCase()
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage
      }
    });

  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      message: 'Login failed. Please try again.'
    });
  }
};


// Get Profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.'
      });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);

    return res.status(500).json({
      message: 'Failed to retrieve profile.'
    });
  }
};


// Update Profile
export const updateProfile = async (req, res) => {
  try {
    const { username, email, profileImage } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.'
      });
    }

    if (username !== undefined) {
      const existingUsername = await User.findOne({
        username,
        _id: { $ne: user._id }
      });

      if (existingUsername) {
        return res.status(409).json({
          message: 'Username already exists.'
        });
      }

      user.username = username.trim();
    }

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();

      const existingEmail = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id }
      });

      if (existingEmail) {
        return res.status(409).json({
          message: 'Email already exists.'
        });
      }

      user.email = normalizedEmail;
    }

    if (profileImage !== undefined) {
      user.profileImage = profileImage;
    }

    await user.save();

    return res.status(200).json({
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Username or email already exists.'
      });
    }

    return res.status(500).json({
      message: 'Profile update failed.'
    });
  }
};


// Change Password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters.'
      });
    }

    const user = await User.findById(req.user.id)
      .select('+password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found.'
      });
    }

    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        message: 'Current password is incorrect.'
      });
    }

    user.password = newPassword;

    // User.js automatically hashes the password before saving
    await user.save();

    return res.status(200).json({
      message: 'Password changed successfully.'
    });

  } catch (error) {
    console.error('Change password error:', error);

    return res.status(500).json({
      message: 'Password change failed.'
    });
  }
};
