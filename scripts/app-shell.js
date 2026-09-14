/* ======================================================================
   FD - Finance Dashboard — app-shell.js
   The chrome every logged-in page shares: sidebar nav, top header,
   user badge, and the auth guard. Depends on supabase-client.js and
   app-data.js being loaded first.

   Usage, at the bottom of each page's own <script>:

     initPage({
       tab: 'overview',
       actionLabel: '+ Add entry',      // header button text, or null for none
       onAction: () => { ... },
       onReady: () => { renderPage(); } // called once the user's data is loaded
     });

   Each page's own script should also set `onStateChange = renderPage`
   so that edits/deletes made on the page refresh it in place.
   ====================================================================== */

function buildNav(activeTab){
  const nav = document.getElementById('mainNav');
  if(!nav) return;
  nav.innerHTML = Object.keys(TAB_LABELS).map(tab => {
    return `<a href="${TAB_PAGES[tab]}" data-tab="${tab}" class="${tab === activeTab ? 'active' : ''}">${svgIcon(tab)}${TAB_LABELS[tab]}</a>`;
  }).join('');
}

function buildProfileBadge(){
  const badge = document.getElementById('profileBadge');
  if(!badge || !currentUser) return;
  badge.innerHTML = `<span class="avatar" style="background:${colorFor(0)}">${initials(currentUser.name)}</span><span class="pname">${escapeHtml(currentUser.name)}</span><button id="switchProfileBtn">Sign out</button>`;
  const switchBtn = document.getElementById('switchProfileBtn');
  if(switchBtn) switchBtn.onclick = signOut;
}

function buildHeader(activeTab, config){
  const title = document.getElementById('pageTitle');
  if(title) title.textContent = TAB_LABELS[activeTab];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser ? currentUser.name.trim().split(/\s+/)[0] : '';
  const dateStr = new Date().toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  const dateSub = document.getElementById('dateSub');
  if(dateSub) dateSub.textContent = firstName ? `${greeting}, ${firstName} · ${dateStr}` : dateStr;

  const actionBtn = document.getElementById('headerActionBtn');
  if(actionBtn){
    if(config.actionLabel){
      actionBtn.style.display = 'inline-block';
      actionBtn.textContent = config.actionLabel;
      actionBtn.onclick = config.onAction || (() => {});
    }else{
      actionBtn.style.display = 'none';
    }
  }
}

function buildFooterActions(){
  const resetBtn = document.getElementById('resetBtn');
  if(resetBtn) resetBtn.onclick = clearAll;
  const signOutBtn = document.getElementById('signOutBtn');
  if(signOutBtn) signOutBtn.onclick = signOut;
}

// Call once per page, after the DOM is parsed. Async: confirms the Supabase
// session, loads the user's data, then builds the shared chrome.
async function initPage(config){
  const user = await getCurrentUser();
  if(!user){
    window.location.href = 'login.html';
    return;
  }
  await loadProfileData();

  buildNav(config.tab);
  buildProfileBadge();
  buildHeader(config.tab, config);
  buildFooterActions();

  if(typeof config.onReady === 'function') config.onReady();
}
