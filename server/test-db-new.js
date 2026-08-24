import mongoose from 'mongoose';
import 'dotenv/config';

console.log('Testing MongoDB connection with updated credentials...');
// Don't log the full URI for security, just check if it's present
if (!process.env.MONGODB_URI) {
    console.error('FAILURE: MONGODB_URI is missing in .env');
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('SUCCESS: Connected to MongoDB');
    process.exit(0);
  })
  .catch(err => {
    console.error('FAILURE: Could not connect to MongoDB');
    console.error(err.message);
    process.exit(1);
  });
