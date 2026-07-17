import dotenv from 'dotenv';
import { connectDB, closeDB } from '../src/config/db.js';
import { deleteCollegePermanently } from '../src/services/collegeService.js';

dotenv.config();

async function run() {
  await connectDB();
  try {
    console.log('Attempting to delete college with ID "6a549e89029032e3d5092a51" (College Code: 101) permanently...');
    const result = await deleteCollegePermanently('6a549e89029032e3d5092a51');
    console.log('✔ Deletion completed successfully! Result:', result);
  } catch (err) {
    console.error('❌ Deletion failed with error:', err);
  } finally {
    await closeDB();
  }
}

run();
