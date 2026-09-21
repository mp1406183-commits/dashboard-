/* Login page: email + password auth via Supabase (supabase.auth). No phone
   number, no PIN — just Sign Up (name, email, password) and Log In
   (email, password). On success this redirects to overview.html. */

let loginMode = 'login'; // 'login' | 'signup'
let loginError = '';
let loginNotice = '';
let submitting = false;

function loginToggleBar(){
  return `<div class="login-toggle">
    <button class="toggle-btn ${loginMode === 'login' ? 'active' : ''}" id="toLoginTab">Log In</button>
    <button class="toggle-btn ${loginMode === 'signup' ? 'active' : ''}" id="toSignupTab">Sign Up</button>
  </div>`;
}

function renderLogin(){
  const root = document.getElementById('root');

  if(loginMode === 'login'){
    root.innerHTML = `<div class="login-shell"><div class="login-wrap">
      <div class="brand-lg"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:var(--glow);box-shadow:0 0 8px var(--glow);display:inline-block;"></span>MONEY MANAGER</div>
      ${loginToggleBar()}
      <h2>Welcome back</h2>
      <div class="lede">Log in with your email and password.</div>
      <div class="create-form">
        <div class="field"><label>Email</label><input type="email" id="lEmail" placeholder="you@example.com" autocomplete="email"></div>
        <div class="field"><label>Password</label><input type="password" id="lPassword" placeholder="••••••••" autocomplete="current-password"></div>
        ${loginError ? `<div class="login-error">${escapeHtml(loginError)}</div>` : ''}
        ${loginNotice ? `<div class="login-note">${escapeHtml(loginNotice)}</div>` : ''}
        <button class="btn-primary" id="loginBtn" ${submitting ? 'disabled' : ''}>${submitting ? 'Logging in…' : 'Log in'}</button>
      </div>
      <div class="login-note">Your data is stored in your own account and synced through Supabase — it'll be here no matter which browser or device you log in from.</div>
    </div></div>`;
    document.getElementById('loginBtn').onclick = doLogin;
    document.getElementById('lPassword').addEventListener('keydown', e => { if(e.key === 'Enter') doLogin(); });

  }else{
    // signup
    root.innerHTML = `<div class="login-shell"><div class="login-wrap">
      <div class="brand-lg"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:var(--glow);box-shadow:0 0 8px var(--glow);display:inline-block;"></span>MONEY MANAGER</div>
      ${loginToggleBar()}
      <h2>Create your account</h2>
      <div class="lede">Sign up with your name, email, and a password.</div>
      <div class="create-form">
        <div class="field"><label>Name</label><input type="text" id="sName" placeholder="e.g. Alex" autocomplete="name"></div>
        <div class="field"><label>Email</label><input type="email" id="sEmail" placeholder="you@example.com" autocomplete="email"></div>
        <div class="field"><label>Password</label><input type="password" id="sPassword" placeholder="At least 6 characters" autocomplete="new-password"></div>
        ${loginError ? `<div class="login-error">${escapeHtml(loginError)}</div>` : ''}
        ${loginNotice ? `<div class="login-note">${escapeHtml(loginNotice)}</div>` : ''}
        <button class="btn-primary" id="signupBtn" ${submitting ? 'disabled' : ''}>${submitting ? 'Creating account…' : 'Create account'}</button>
      </div>
      <div class="login-note">Passwords are handled entirely by Supabase Auth — this app never sees or stores them itself.</div>
    </div></div>`;
    document.getElementById('signupBtn').onclick = doSignup;
    document.getElementById('sPassword').addEventListener('keydown', e => { if(e.key === 'Enter') doSignup(); });
  }

  const toLogin = document.getElementById('toLoginTab');
  const toSignup = document.getElementById('toSignupTab');
  if(toLogin) toLogin.onclick = () => { loginMode = 'login'; loginError = ''; loginNotice = ''; renderLogin(); };
  if(toSignup) toSignup.onclick = () => { loginMode = 'signup'; loginError = ''; loginNotice = ''; renderLogin(); };
}

async function doLogin(){
  const email = document.getElementById('lEmail').value.trim();
  const password = document.getElementById('lPassword').value;
  if(!email || !password){ loginError = 'Enter your email and password.'; renderLogin(); return; }
  loginError = ''; loginNotice = ''; submitting = true; renderLogin();
  const result = await signIn(email, password);
  submitting = false;
  if(result.error){
    loginError = result.error.message || 'Could not log in. Check your email and password.';
    renderLogin();
    return;
  }
  window.location.href = 'overview.html';
}

async function doSignup(){
  const name = document.getElementById('sName').value.trim();
  const email = document.getElementById('sEmail').value.trim();
  const password = document.getElementById('sPassword').value;
  if(!name){ loginError = 'Enter your name.'; renderLogin(); return; }
  if(!email){ loginError = 'Enter your email.'; renderLogin(); return; }
  if(!password || password.length < 6){ loginError = 'Password must be at least 6 characters.'; renderLogin(); return; }
  loginError = ''; loginNotice = ''; submitting = true; renderLogin();
  const result = await signUp(name, email, password);
  submitting = false;
  if(result.error){
    loginError = result.error.message || 'Could not create your account.';
    renderLogin();
    return;
  }
  if(result.needsEmailConfirmation){
    loginMode = 'login';
    loginNotice = 'Account created — check your email to confirm it, then log in.';
    renderLogin();
    return;
  }
  window.location.href = 'overview.html';
}

// If a session already exists (e.g. this tab was left signed in), skip
// straight to the app instead of showing the login form. If anything goes
// wrong (network down, blocked script, bad credentials) show a message
// instead of leaving the page stuck on "Loading…" forever.
(async () => {
  try{
    const user = await withTimeout(getCurrentUser(), 12000, "Couldn't reach the server to check your login. Check your connection and reload.");
    if(user){
      window.location.href = 'overview.html';
      return;
    }
    renderLogin();
  }catch(e){
    console.error('Login page failed to start', e);
    const root = document.getElementById('root');
    if(root){
      root.innerHTML = `<div style="max-width:520px; margin:60px auto; padding:24px; font-family:sans-serif; line-height:1.5;">
        <h2 style="margin-top:0;">Something went wrong loading the login page</h2>
        <p>${escapeHtml(e.message || 'Unknown error.')}</p>
        <p><b>Try:</b> reloading the page, checking your internet connection, or turning off any ad/tracker blocker for this site.</p>
      </div>`;
    }
  }
})();
