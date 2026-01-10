// Simple script that doesn't need Supabase connection
// Just generates the SQL you need to run
require('dotenv').config();
const bcrypt = require('bcryptjs');

async function generatePasswordUpdateSQL() {
    const userId = '9318d277-ca77-4e7e-84ea-feda42704fe6';
    const newPassword = 'NewPassword123!';
    
    console.log('🔐 Generating password update SQL...');
    console.log('👤 User ID:', userId);
    console.log('🆕 New Password:', newPassword);
    console.log('');
    
    // Hash the password with bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    console.log('✅ Password hashed successfully!');
    console.log('🔒 Hash:', hashedPassword);
    console.log('');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('📋 RUN THIS SQL IN SUPABASE SQL EDITOR:');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`UPDATE profiles SET password_hash = '${hashedPassword}', updated_at = NOW() WHERE id = '${userId}';`);
    console.log('');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📍 Go to: https://supabase.com → Your Project → SQL Editor');
    console.log('📝 Paste the SQL above and click "Run"');
    console.log('');
    console.log('After running, user can login with:');
    console.log('   📧 Email: Kartiknain@dmhca.in');
    console.log('   🔑 Password:', newPassword);
}

generatePasswordUpdateSQL().catch(console.error);