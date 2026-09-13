/* ======================================================================
   FD - Finance Dashboard — app-shell.js
   The chrome every logged-in page shares: sidebar nav, top header,
   profile badge, and the "you must be logged in" guard.
   Depends on app-data.js being loaded first.

   Usage, at the bottom of each page's own <script>:

     initPage({
       tab: 'overview',                 // which nav item is active
       actionLabel: '+ Add entry',      // header button text, or null for none
       onAction: () => { ... },         // header button click handler
       onReady: () => { renderPage(); } // called once the profile's data is loaded
     });

   Each page's own script should also set `onStateChange = renderPage`
   (renderPage being that page's own "redraw my content" function) so
   that edits/deletes made on the page refresh it in place.
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
  if(!badge) return;
  const idx = profiles.findIndex(p => p.id === currentProfileId);
  const profile = profiles[idx];
  badge.innerHTML = `<span class="avatar" style="background:${colorFor(Math.max(idx,0))}">${initials(profile ? profile.name : '?')}</span><span class="pname">${escapeHtml(profile ? profile.name : '')}</span><button id="switchProfileBtn">Switch</button>`;
  const switchBtn = document.getElementById('switchProfileBtn');
  if(switchBtn) switchBtn.onclick = logout;
}

function buildHeader(activeTab, config){
  const title = document.getElementById('pageTitle');
  if(title) title.textContent = TAB_LABELS[activeTab];

  const idx = profiles.findIndex(p => p.id === currentProfileId);
  const profile = profiles[idx];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = profile ? profile.name.trim().split(/\s+/)[0] : '';
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
  const deleteBtn = document.getElementById('deleteProfileBtn');
  if(deleteBtn) deleteBtn.onclick = () => { if(currentProfileId) deleteProfile(currentProfileId); };
}

// Call once per page, after the DOM is parsed.
function initPage(config){
  if(!currentProfileId){
    window.location.href = 'login.html';
    return;
  }
  loadProfiles();
  // If the profile was removed (e.g. deleted from another tab) bounce to login.
  if(!profiles.some(p => p.id === currentProfileId)){
    logout();
    return;
  }
  loadProfileData();

  buildNav(config.tab);
  buildProfileBadge();
  buildHeader(config.tab, config);
  buildFooterActions();

  if(typeof config.onReady === 'function') config.onReady();
}
