const bcrypt = require('bcrypt');

// Change this to the desired new password
const newPassword = 'NewPassword123!'; // Change this to your desired password

async function generatePasswordHash() {
  try {
    const hash = await bcrypt.hash(newPassword, 12);
    console.log('New password:', newPassword);
    console.log('Generated hash:', hash);
    console.log('\nSQL Update Command:');
    console.log(`UPDATE "public"."profiles" SET "password_hash" = '${hash}', "updated_at" = NOW() WHERE "id" = '9318d277-ca77-4e7e-84ea-feda42704fe6';`);
  } catch (error) {
    console.error('Error generating hash:', error);
  }
}

generatePasswordHash();