import 'dotenv/config';
const uri = process.env.MONGODB_URI || 'MISSING';
console.log('URI starts with:', uri.substring(0, 20));
console.log('URI length:', uri.length);
console.log('Password length:', uri.split(':')[2]?.split('@')[0]?.length);
