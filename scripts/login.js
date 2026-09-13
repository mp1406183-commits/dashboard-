/* Login page: pick a profile, enter its PIN, or create a new profile.
   On success this sets the current profile and sends the browser to overview.html. */

// Already logged in (e.g. someone typed this URL directly)? Skip straight to the app.
if(currentProfileId){
  window.location.href = 'overview.html';
}

loadProfiles();
let loginMode = profiles.length === 0 ? 'create' : 'select';
let pinTargetProfile = null;
let loginError = '';

function loginToggleBar(){
  return `<div class="login-toggle">
    <button class="toggle-btn ${loginMode === 'select' ? 'active' : ''}" id="toLoginTab">Log In</button>
    <button class="toggle-btn ${loginMode === 'create' ? 'active' : ''}" id="toCreateTab">New Profile</button>
  </div>`;
}

function renderLogin(){
  const root = document.getElementById('root');

  if(loginMode === 'select'){
    root.innerHTML = `<div class="login-shell"><div class="login-wrap">
      <div class="brand-lg"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:var(--glow);box-shadow:0 0 8px var(--glow);display:inline-block;"></span>FD - FINANCE DASHBOARD</div>
      ${loginToggleBar()}
      <h2>Who's this?</h2>
      ${profiles.length === 0 ? `
        <div class="lede">No profiles saved yet in this browser. Create one to get started.</div>
        <button class="btn-primary" id="showCreateBtn" style="margin-top:6px;">+ Create your first profile</button>
      ` : `
        <div class="lede">Pick a profile to see your own accounts and transactions.</div>
        <div class="profile-list">
          ${profiles.map((p,i) => `
            <div class="profile-item">
              <button class="profile-select" data-id="${p.id}">
                <span class="avatar" style="background:${colorFor(i)}">${initials(p.name)}</span>
                <span style="min-width:0;"><div class="profile-name">${escapeHtml(p.name)}</div>${p.phone ? `<div style="color:var(--text-faint); font-size:11px; margin-top:2px;">${escapeHtml(p.phone)}</div>` : ''}</span>
              </button>
              <button class="profile-remove" data-remove="${p.id}">×</button>
            </div>
          `).join('')}
        </div>
        <button class="btn-ghost" id="showCreateBtn">+ Add a profile</button>
      `}
      <div class="login-note">PINs are a light way to keep each person's entries separate on a shared device — plain 4-digit codes, not encrypted security. Profiles and data are saved in this browser's local storage, so they'll be here next time you open these files in the same browser on the same device — but they won't follow you to a different browser or computer.</div>
    </div></div>`;
    document.querySelectorAll('.profile-select').forEach(btn => { btn.onclick = () => selectProfile(btn.dataset.id); });
    document.querySelectorAll('.profile-remove').forEach(btn => { btn.onclick = () => { deleteProfile(btn.dataset.remove); renderLogin(); }; });
    const showCreate = document.getElementById('showCreateBtn');
    if(showCreate) showCreate.onclick = () => { loginMode = 'create'; loginError = ''; renderLogin(); };

  }else if(loginMode === 'pin' && pinTargetProfile){
    root.innerHTML = `<div class="login-shell"><div class="login-wrap">
      <button class="back-link" id="backLink">← All profiles</button>
      <h2>Enter PIN for ${escapeHtml(pinTargetProfile.name)}</h2>
      <div class="lede">4-digit PIN</div>
      <div class="pin-boxes">${[0,1,2,3].map(i => `<input type="password" inputmode="numeric" maxlength="1" class="pinDigit" data-i="${i}">`).join('')}</div>
      <div class="login-error">${loginError}</div>
      <button class="btn-primary" id="unlockBtn">Unlock</button>
    </div></div>`;
    const back = document.getElementById('backLink');
    if(back) back.onclick = backToSelect;
    pinAutoAdvance('.pinDigit', (pin) => verifyPin(pin));
    document.getElementById('unlockBtn').onclick = () => {
      const pin = Array.from(document.querySelectorAll('.pinDigit')).map(b => b.value).join('');
      if(pin.length === 4) verifyPin(pin); else { loginError = 'Enter all 4 digits.'; renderLogin(); }
    };

  }else{
    // create
    root.innerHTML = `<div class="login-shell"><div class="login-wrap">
      <div class="brand-lg"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:var(--glow);box-shadow:0 0 8px var(--glow);display:inline-block;"></span>FD - FINANCE DASHBOARD</div>
      ${loginToggleBar()}
      <h2>${profiles.length === 0 ? 'Welcome to FD - Finance Dashboard' : 'New profile'}</h2>
      <div class="lede">${profiles.length === 0 ? "Create a profile to get started. Add more people any time." : "Give this person a name and a 4-digit PIN."}</div>
      <div class="create-form">
        <div class="field"><label>Name</label><input type="text" id="cName" placeholder="e.g. Alex"></div>
        <div class="field"><label>Phone number <span style="color:var(--text-faint)">(optional)</span></label><input type="tel" id="cPhone" placeholder="e.g. (555) 123-4567"></div>
        <div class="field"><label>4-digit PIN</label><div class="pin-boxes">${[0,1,2,3].map(i => `<input type="password" inputmode="numeric" maxlength="1" class="createPinDigit" data-i="${i}">`).join('')}</div></div>
        <div class="login-error">${loginError}</div>
        <button class="btn-primary" id="createBtn">Create profile</button>
      </div>
      <div class="login-note">This PIN just keeps profiles separate on this device — don't reuse a password you rely on elsewhere.</div>
    </div></div>`;
    const toLogin = document.getElementById('toLoginTab');
    const toCreate = document.getElementById('toCreateTab');
    if(toLogin) toLogin.onclick = () => { loginMode = 'select'; loginError = ''; renderLogin(); };
    if(toCreate) toCreate.onclick = () => { loginMode = 'create'; loginError = ''; renderLogin(); };
    document.getElementById('createBtn').onclick = () => {
      const name = document.getElementById('cName').value.trim();
      const phone = document.getElementById('cPhone').value.trim();
      const digits = Array.from(document.querySelectorAll('.createPinDigit')).map(b => b.value);
      if(!name){ loginError = 'Enter a name.'; renderLogin(); return; }
      if(digits.some(d => d === '')){ loginError = 'Enter all 4 PIN digits.'; renderLogin(); return; }
      createProfile(name, digits.join(''), phone); // redirects to overview.html on success
    };
  }

  // The toggle bar's own tab buttons need wiring whenever it's in the DOM
  // (select and create modes both render it).
  const toLogin = document.getElementById('toLoginTab');
  const toCreate = document.getElementById('toCreateTab');
  if(toLogin) toLogin.onclick = () => { loginMode = 'select'; loginError = ''; renderLogin(); };
  if(toCreate) toCreate.onclick = () => { loginMode = 'create'; loginError = ''; renderLogin(); };
}

function selectProfile(id){
  pinTargetProfile = profiles.find(p => p.id === id) || null;
  if(!pinTargetProfile) return;
  loginError = '';
  loginMode = 'pin';
  renderLogin();
  focusFirstPinBox();
}
function backToSelect(){
  loginMode = profiles.length === 0 ? 'create' : 'select';
  loginError = '';
  pinTargetProfile = null;
  renderLogin();
}
function verifyPin(pin){
  if(pinTargetProfile && pin === pinTargetProfile.pin){
    setCurrentProfile(pinTargetProfile.id);
    loadProfileData();
    window.location.href = 'overview.html';
  }else{
    loginError = 'Incorrect PIN. Try again.';
    renderLogin();
    focusFirstPinBox();
  }
}

function focusFirstPinBox(){
  setTimeout(() => { const el = document.querySelector('.pin-boxes input'); if(el) el.focus(); }, 0);
}
function pinAutoAdvance(selector, onComplete){
  const boxes = Array.from(document.querySelectorAll(selector));
  boxes.forEach((box, i) => {
    box.oninput = () => {
      box.value = box.value.replace(/[^0-9]/g, '').slice(0,1);
      if(box.value && i < boxes.length - 1) boxes[i+1].focus();
      if(boxes.every(b => b.value.length === 1)) onComplete(boxes.map(b => b.value).join(''));
    };
    box.onkeydown = (e) => { if(e.key === 'Backspace' && !box.value && i > 0) boxes[i-1].focus(); };
  });
  if(boxes[0]) boxes[0].focus();
}

onStateChange = renderLogin;
renderLogin();
