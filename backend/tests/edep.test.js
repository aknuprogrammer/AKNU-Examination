import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import crypto from 'crypto';

import User from '../src/models/User.js';
import College from '../src/models/College.js';
import Exam from '../src/models/Exam.js';
import Subject from '../src/models/Subject.js';
import PaperMapping from '../src/models/PaperMapping.js';
import DayPassword from '../src/models/DayPassword.js';

import * as authService from '../src/services/authService.js';
import * as collegeService from '../src/services/collegeService.js';
import * as paperService from '../src/services/paperService.js';
import { encryptPassword, decryptPassword } from '../src/utils/crypto.js';

beforeAll(async () => {
  // Set required env variables for testing
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_123456';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_123456';
  process.env.DAY_PASSWORD_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const uri = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/edep_test';
  await mongoose.connect(uri);

  // Clear collections for clean start
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  try {
    await mongoose.connection.db.dropDatabase();
  } catch (e) {
    // Ignore if drop fail
  }
  await mongoose.disconnect();
});

describe('EDEP Integration & Security Tests', () => {
  
  // 1. Password Encryption & Decryption
  it('should encrypt and decrypt Day Passwords reversibly using AES-256-GCM', () => {
    const rawPassword = 'AknuSecretPassword2026';
    const { encryptedPassword, iv, tag } = encryptPassword(rawPassword);
    
    expect(encryptedPassword).not.toBe(rawPassword);
    expect(iv).toBeDefined();
    expect(tag).toBeDefined();

    const decrypted = decryptPassword(encryptedPassword, iv, tag);
    expect(decrypted).toBe(rawPassword);
  });

  // 2. Authentication and Account Locking
  it('should lock accounts after 5 failed login attempts', async () => {
    // Create test user
    const username = 'testuser';
    const password = 'TestUserPassword@123';
    const email = 'testuser@aknu.edu.in';
    const mobile = '9999999999';

    const user = new User({
      username,
      password, // hashed automatically
      role: 'Principal',
      email,
      mobile,
      isActive: true
    });
    await user.save();

    // Perform 4 failed logins
    for (let i = 0; i < 4; i++) {
      await expect(
        authService.loginUser({
          username,
          password: 'IncorrectPassword',
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0'
        })
      ).rejects.toThrow('Invalid username or password');
    }

    // Check that user is not locked yet
    let freshUser = await User.findOne({ username });
    expect(freshUser.failedLoginAttempts).toBe(4);
    expect(freshUser.isLocked).toBe(false);

    // 5th failed login
    await expect(
      authService.loginUser({
        username,
        password: 'IncorrectPassword',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0'
      })
    ).rejects.toThrow(/locked/);

    // Check lock status
    freshUser = await User.findOne({ username });
    expect(freshUser.failedLoginAttempts).toBe(5);
    expect(freshUser.isLocked).toBe(true);
    expect(freshUser.lockUntil).toBeDefined();
  });

  // 3. College and Linked Principal Creation
  it('should auto-create a Principal User linked to the college on creation', async () => {
    const collegeData = {
      collegeCode: 'CLG999',
      collegeName: 'Test Affiliated College',
      district: 'East Godavari',
      principalName: 'Dr. John Doe',
      principalEmail: 'johndoe@aknu.edu.in',
      principalMobile: '9123456789'
    };

    const college = await collegeService.createCollege(
      collegeData,
      'admin',
      '127.0.0.1',
      'Mozilla/5.0'
    );

    expect(college.collegeCode).toBe(collegeData.collegeCode);
    expect(college.principalUserId).toBeDefined();

    // Verify Principal User exists in DB
    const principalUser = await User.findById(college.principalUserId);
    expect(principalUser).toBeDefined();
    expect(principalUser.username).toBe('principal_clg999');
    expect(principalUser.role).toBe('Principal');
    expect(principalUser.forcePasswordChange).toBe(true);
  });
});
