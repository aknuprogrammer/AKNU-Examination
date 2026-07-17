import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB, closeDB } from '../src/config/db.js';
import User from '../src/models/User.js';

dotenv.config();

async function run() {
  await connectDB();
  
  try {
    // 1. Fetch real admin from database
    const admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      console.error('Admin user not found in database.');
      await closeDB();
      return;
    }

    console.log(`Found admin user. ID: ${admin._id}, Current Session ID: ${admin.currentSessionId}`);

    // Generate valid token
    const tokenPayload = {
      userId: admin._id.toString(),
      username: admin.username,
      role: admin.role,
      sessionId: admin.currentSessionId || 'mock_session'
    };

    const secret = process.env.JWT_ACCESS_SECRET;
    const token = jwt.sign(tokenPayload, secret, { expiresIn: '15m' });

    // 2. Perform HTTP DELETE request to localhost:5000/api/colleges/6a549e8a029032e3d5092a57 (College 102)
    const url = 'http://localhost:5000/api/colleges/6a549e8a029032e3d5092a57';
    console.log(`Sending HTTP DELETE to ${url}...`);

    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log(`✔ API Response (Status: ${res.status}):`, data);

  } catch (err) {
    console.error('❌ Request failed:', err.message);
  } finally {
    await closeDB();
  }
}

run();
