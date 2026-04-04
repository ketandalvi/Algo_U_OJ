/**
 * Admin Role Setter Utility
 *
 * Usage: NODE_TLS_REJECT_UNAUTHORIZED=0 node set-admin.mjs <email>
 *
 * Sets a user's role to 'admin' in the database.
 * Useful for development and testing.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: { type: String, default: 'user' },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

try {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);

  const email = process.argv[2];
  if (!email) {
    console.log('❌ Usage: node set-admin.mjs <email>');
    process.exit(1);
  }

  console.log(`👤 Setting admin role for: ${email}`);

  const result = await User.findOneAndUpdate(
    { email },
    { role: 'admin' },
    { returnDocument: 'after' }
  );

  if (result) {
    console.log(`✅ SUCCESS: ${result.email} → role: ${result.role}`);
  } else {
    console.log(`❌ User not found: ${email}`);
  }

  await mongoose.connection.close();
  process.exit(0);
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
