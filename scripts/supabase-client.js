/* ======================================================================
   FD - Finance Dashboard — supabase-client.js
   Creates the one shared Supabase client every page uses for auth and data.

   >>> FILL IN YOUR OWN PROJECT VALUES BELOW <<<
   Find these in your Supabase dashboard: Project Settings → API.
   The "anon public" key is safe to ship in client-side code — it only
   works within the Row Level Security policies defined in
   supabase-schema.sql (see the README).
   ====================================================================== */

const SUPABASE_URL = 'https://dspycxdjkzqktalslljh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzcHljeGRqa3pxa3RhbHNsbGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNzczMTIsImV4cCI6MjEwNDc1MzMxMn0.oJosV0PHqknfvDJdzlHHACtXsC_T4AbT4ig7IDpkjE8';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
