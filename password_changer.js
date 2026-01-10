// Simple password hash generator using Node.js built-in crypto
const crypto = require('crypto');

const newPassword = 'NewPassword123!'; // Change this to your desired password
const userId = '9318d277-ca77-4e7e-84ea-feda42704fe6';

// Generate a salt and hash using built-in crypto
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(newPassword, salt, 1000, 64, 'sha512').toString('hex');
const fullHash = `$pbkdf2$${salt}$${hash}`;

console.log('🔐 Password Change Information:');
console.log('================================');
console.log('New password:', newPassword);
console.log('User ID:', userId);
console.log('Generated hash:', fullHash);
console.log('');
console.log('📝 SQL Update Command:');
console.log(`UPDATE "public"."profiles" SET "password_hash" = '${fullHash}', "updated_at" = NOW() WHERE "id" = '${userId}';`);
console.log('');
console.log('🌐 API Command (replace YOUR_ADMIN_TOKEN):');
console.log(`curl -X PUT "https://dmhca-worksheet.onrender.com/api/users/${userId}/change-password" \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\`);
console.log(`  -d '{"newPassword": "${newPassword}"}'`);