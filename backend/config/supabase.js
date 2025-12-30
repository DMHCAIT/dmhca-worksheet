const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials:', {
    url: supabaseUrl ? 'Set' : 'Missing',
    key: supabaseKey ? 'Set' : 'Missing'
  });
  throw new Error('Missing Supabase credentials');
}

// Create client with anon key for now (service key validation issues)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = supabase;