const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  console.log('🚀 Setting up production database schema...')
  
  try {
    // Test connection first
    console.log('🔗 Testing database connection...')
    const { data, error } = await supabase.from('profiles').select('id').limit(1)
    
    if (error && error.code === 'PGRST116') {
      console.log('📋 Profiles table does not exist, creating basic schema...')
      
      // For Supabase, we need to apply the schema through their dashboard
      // or use their SQL editor. Let's just verify what we have.
      console.log('ℹ️  Please apply the database schema manually using the Supabase dashboard SQL editor.')
      console.log('📁 Use the schema from: database/quick-setup.sql')
      
    } else if (error) {
      console.log('⚠️  Database connection error:', error.message)
    } else {
      console.log('✅ Database connection successful!')
      console.log(`📊 Found ${data.length} profiles in database`)
    }
    
    // Check other tables
    console.log('\n🔍 Checking existing tables...')
    
    const tables = ['profiles', 'projects', 'tasks', 'work_projections', 'notifications']
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('id').limit(1)
        if (error) {
          console.log(`   ❌ Table '${table}': ${error.message}`)
        } else {
          console.log(`   ✅ Table '${table}': OK (${data.length} rows checked)`)
        }
      } catch (err) {
        console.log(`   ❌ Table '${table}': ${err.message}`)
      }
    }
    
    console.log('\n✅ Database check completed!')
    console.log('\nNext steps:')
    console.log('1. If tables are missing, apply database/quick-setup.sql in Supabase SQL Editor')
    console.log('2. Ensure RLS policies are properly configured')
    console.log('3. Test authentication and API endpoints')
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  setupDatabase()
}

module.exports = { setupDatabase }