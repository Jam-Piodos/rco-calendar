import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

console.log('Supabase initialization:');
console.log('- URL defined:', !!supabaseUrl);
console.log('- API Key defined:', !!supabaseKey);

// Create the client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Check if we can connect to Supabase
(async () => {
  try {
    // Test the connection
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection test failed:', error);
    } else {
      console.log('Supabase connection successful!');
    }
    
    // Try to get the RLS policies from the system tables (requires admin rights)
    // This might not work with anon key, but worth a try
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*');
      
    if (policiesError) {
      console.log('Cannot read Supabase policies (expected with anon key)');
    } else if (policies) {
      console.log('Available policies:', policies);
    }
    
    // Check auth status
    const { data: authData } = await supabase.auth.getSession();
    console.log('Initial auth status:', authData?.session ? 'Authenticated' : 'Not authenticated');
    
  } catch (err) {
    console.error('Error testing Supabase connection:', err);
  }
})();