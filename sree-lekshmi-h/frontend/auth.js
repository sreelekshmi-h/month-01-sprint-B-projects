const API_URL = 'https://ideaforge-3ij8.onrender.com';
const TOKEN_KEY = 'access_token';

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function setToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* storage blocked */ }
}

// Already logged in → go straight to the app
if (getToken()) {
  window.location.replace('index.html');
}

const mode = document.body.dataset.mode; // 'login' | 'register'
const form = document.getElementById('authForm');
const errorEl = document.getElementById('authError');
const button = document.getElementById('authBtn');
const btnText = button.querySelector('.btn-text');
const btnSpinner = button.querySelector('.btn-spinner');
const idleLabel = btnText.textContent;

// Message from the app after an expired session
if (new URLSearchParams(window.location.search).get('expired')) {
  errorEl.textContent = 'Your session expired. Please log in again.';
}

// FastAPI sends a list for validation errors (422), a string otherwise
function errorText(detail, fallback) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return 'Username needs 3+ characters and password 8+ characters.';
  return fallback;
}

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  errorEl.textContent = '';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !password) {
    errorEl.textContent = 'Please enter your username and password.';
    return;
  }
  if (mode === 'register' && (username.length < 3 || password.length < 8)) {
    errorEl.textContent = 'Username needs 3+ characters and password 8+ characters.';
    return;
  }

  button.disabled = true;
  btnText.textContent = mode === 'register' ? 'Creating account…' : 'Logging in…';
  btnSpinner.hidden = false;

  try {
    const response = await fetch(`${API_URL}/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(errorText(data.detail, 'Request failed.'));
    }

    setToken(data.access_token);
    window.location.href = 'index.html';
  } catch (err) {
    // "Failed to fetch" = server asleep/unreachable
    errorEl.textContent = err.message === 'Failed to fetch'
      ? 'Cannot reach the server. It may be waking up — try again in a minute.'
      : err.message;
    button.disabled = false;
    btnText.textContent = idleLabel;
    btnSpinner.hidden = true;
  }
});
