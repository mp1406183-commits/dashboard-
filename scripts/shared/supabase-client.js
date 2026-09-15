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

// If this stays "undefined", the browser blocked or failed to load the
// Supabase CDN script tag that must appear BEFORE this file in every page's
// <head>/<body> (an ad/tracker blocker like Brave Shields is a common cause).
// Show a plain-language error instead of silently freezing on "Loading…".
if(typeof window.supabase === 'undefined'){
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('root');
    if(root){
      root.innerHTML = `<div style="max-width:520px; margin:80px auto; padding:24px; font-family:sans-serif; line-height:1.5;">
        <h2 style="margin-top:0;">Couldn't load a required script</h2>
        <p>This page needs a script from <code>cdn.jsdelivr.net</code> that didn't load — often caused by an ad/tracker blocker (Brave Shields, uBlock Origin, etc.) or no internet connection.</p>
        <p><b>Try:</b> turning off shields/ad-block for this site and reloading, or opening the page in a different browser.</p>
      </div>`;
    }
  });
  throw new Error('Supabase JS failed to load — check ad blockers / network and reload.');
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
