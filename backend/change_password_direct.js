const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eaobbmktohxztvpygdgs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key needed for updates

if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    console.log('💡 Please set the service role key in backend/.env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function changeUserPassword() {
    const userId = '9318d277-ca77-4e7e-84ea-feda42704fe6';
    const newPassword = 'NewPassword123!';
    
    try {
        console.log('🔐 Changing password for user:', userId);
        console.log('🆕 New password:', newPassword);
        
        // Hash the password
        console.log('🔒 Hashing password...');
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        console.log('✅ Password hashed successfully');
        
        // Update in database
        console.log('💾 Updating database...');
        const { data, error } = await supabase
            .from('profiles')
            .update({ 
                password_hash: hashedPassword,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select('id, email, full_name');
        
        if (error) {
            console.error('❌ Database error:', error);
            return;
        }
        
        if (data && data.length > 0) {
            console.log('✅ Password updated successfully!');
            console.log('👤 User updated:', {
                id: data[0].id,
                email: data[0].email,
                name: data[0].full_name
            });
        } else {
            console.log('⚠️ No user found with that ID');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run the password change
changeUserPassword();