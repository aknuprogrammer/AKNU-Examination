import dotenv from 'dotenv';
import { connectDB, closeDB } from '../src/config/db.js';
import College from '../src/models/College.js';
import User from '../src/models/User.js';

dotenv.config();

async function run() {
  await connectDB();
  try {
    const colleges = await College.find({}).populate('principalUserId');
    console.log('--- COLLEGES IN DATABASE ---');
    if (colleges.length === 0) {
      console.log('No colleges found.');
    } else {
      colleges.forEach(c => {
        console.log(`• ID: ${c._id}`);
        console.log(`  Code: ${c.collegeCode}`);
        console.log(`  Name: ${c.collegeName}`);
        console.log(`  Principal User ID: ${c.principalUserId?._id || 'N/A'}`);
        console.log(`  Principal Username: ${c.principalUserId?.username || 'N/A'}`);
        console.log('-----------------------------');
      });
    }
  } catch (err) {
    console.error(err);
  } finally {
    await closeDB();
  }
}

run();
