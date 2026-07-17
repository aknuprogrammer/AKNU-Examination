import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { connectDB, closeDB } from '../src/config/db.js';
import User from '../src/models/User.js';

dotenv.config();

async function run() {
  await connectDB();
  try {
    const admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      console.error('Admin user not found.');
      await closeDB();
      return;
    }

    const token = jwt.sign({
      userId: admin._id.toString(),
      username: admin.username,
      role: admin.role,
      sessionId: admin.currentSessionId || 'mock_session'
    }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });

    const url = 'http://localhost:5000/api/colleges/papers/123';
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
