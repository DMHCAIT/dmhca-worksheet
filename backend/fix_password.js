// Load environment variables first
require('dotenv').config();

const bcrypt = require('bcryptjs');
const supabase = require('./config/supabase');

async function changeUserPassword() {
    const userId = '9318d277-ca77-4e7e-84ea-feda42704fe6';
    const newPassword = 'NewPassword123!';
    
    try {
        console.log('🔐 Changing password for user:', userId);
        console.log('🆕 New password:', newPassword);
        
        // First verify user exists
        console.log('🔍 Finding user...');
        const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('id, email, full_name, role')
            .eq('id', userId)
            .single();
        
        if (userError || !userData) {
            console.error('❌ User not found:', userError?.message || 'No user data');
            return;
        }
        
        console.log('👤 Found user:', {
            email: userData.email,
            name: userData.full_name,
            role: userData.role
        });
        
        // Hash the password
        console.log('🔒 Hashing password...');
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        console.log('✅ Password hashed successfully');
        
        // Update in database
        console.log('💾 Updating password in database...');
        const { data: updateData, error: updateError } = await supabase
            .from('profiles')
            .update({ 
                password_hash: hashedPassword,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select('id, email, full_name, updated_at');
        
        if (updateError) {
            console.error('❌ Database update error:', updateError);
            return;
        }
        
        if (updateData && updateData.length > 0) {
            console.log('✅ Password updated successfully!');
            console.log('📅 Updated at:', updateData[0].updated_at);
            console.log('👍 You can now login with:');
            console.log('   Email:', updateData[0].email);
            console.log('   Password:', newPassword);
        } else {
            console.log('⚠️ Update completed but no data returned');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

console.log('🚀 Starting password change process...');
changeUserPassword().then(() => {
    console.log('🏁 Password change process completed');
    process.exit(0);
}).catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
});