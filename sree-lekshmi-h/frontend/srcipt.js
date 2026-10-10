// Local testing (file:// or localhost) → local backend, otherwise Render
const IS_LOCAL = ['', 'localhost', '127.0.0.1'].includes(window.location.hostname);
const API_URL = 'https://ideaforge-3ij8.onrender.com';
const TOKEN_KEY = 'access_token';

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
}

// Not logged in → login page
if (!getToken()) {
  window.location.replace('login.html');
}

document.getElementById('logoutBtn')?.addEventListener('click', function () {
  clearToken();
  window.location.href = 'login.html';
});

/* ---------- Generate ---------- */
document.getElementById('ideaForm').addEventListener('submit', async function (e) {

  e.preventDefault();

  // Note: there are two elements with id="results" in the HTML (section + div).
  // We target the inner container specifically.
  const resultsDiv = document.querySelector('.results-container');
  const button = document.getElementById('submitBtn');
  const btnText = button.querySelector('.btn-text');
  const btnSpinner = button.querySelector('.btn-spinner');

  // Clear previous errors
  clearErrors();

  // 1. Read form values
  const theme = document.getElementById('theme').value.trim();
  const skillsRaw = document.getElementById('skills').value.trim();
  const teamSize = document.getElementById('teamSize').value.trim();
  const experience = document.getElementById('experience').value;
  const hours = document.getElementById('hours').value.trim();
  const requirements = document.getElementById('extra').value.trim();

  // 2. Convert skills string into a list
  const skills = skillsRaw
    .split(',')
    .map(skill => skill.trim())
    .filter(skill => skill.length > 0);

  // 3. Build the JSON payload
  const payload = {
    theme: theme,
    skills: skills,
    team_size: Number(teamSize) || 0,
    experience: experience,
    hours: Number(hours) || 0,
    requirements: requirements || null
  };

  // 4. Validate required fields with visual feedback
  let hasError = false;

  if (!theme) {
    showError('theme', 'Please enter a hackathon theme.');
    hasError = true;
  }
  if (skills.length === 0) {
    showError('skills', 'Please list at least one skill.');
    hasError = true;
  }
  if (!teamSize || Number(teamSize) < 1) {
    showError('teamSize', 'Enter a valid team size.');
    hasError = true;
  }
  if (!hours || Number(hours) < 1) {
    showError('hours', 'Enter available hours.');
    hasError = true;
  }

  if (hasError) {
    return;
  }

  const token = getToken();
  if (!token) {
    window.location.replace('login.html');
    return;
  }

  // Loading state
  resultsDiv.innerHTML = `
    <div class="loading-state">
      <svg class="spinner" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" stroke-linecap="round"/>
      </svg>
      <p>Generating ideas…</p>
    </div>
  `;

  button.disabled = true;
  btnText.textContent = 'Generating…';
  btnSpinner.hidden = false;

  try {
    // 5. Send to FastAPI backend with the JWT
    const response = await fetch(`${API_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    // Token missing/expired/invalid → back to login
    if (response.status === 401) {
      clearToken();
      window.location.replace('login.html?expired=1');
      return;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Something went wrong.');
    }

    // 6. Read the response
    const data = await response.json();

    // 7. Display results
    // Expecting: { "ideas": "....." }
    resultsDiv.innerHTML = `<pre class="results-pre">${escapeHtml(data.ideas)}</pre>`;

    // Smooth scroll to results
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    resultsDiv.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
    console.error(err);
  } finally {
    button.disabled = false;
    btnText.textContent = 'Generate Ideas';
    btnSpinner.hidden = true;
  }
});

/* Helpers */
function showError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(fieldId + '-error');
  if (input) input.classList.add('invalid');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('visible');
  }
}

function clearErrors() {
  document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
  document.querySelectorAll('.error-msg').forEach(el => {
    el.textContent = '';
    el.classList.remove('visible');
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* Active nav link on scroll */
const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
const sections = document.querySelectorAll('section[id]');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    if (section.hidden) return;
    const top = section.offsetTop - 80;
    if (window.scrollY >= top) {
      current = section.getAttribute('id');
    }
  });
  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === '#' + current);
  });
});

window.__ideaForgeReady = true;
