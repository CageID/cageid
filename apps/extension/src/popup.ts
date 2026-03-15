/**
 * CAGE Extension — Popup Script
 *
 * Note: Popup scripts loaded via <script> cannot use ES module imports.
 * Config values are inlined here.
 */

// ─── Config (inlined — keep in sync with config.ts) ───────────────────────────

const SERVER_URL = 'https://api.cageid.app';
const STORAGE_KEYS = {
  SESSION_ID: 'cage_session_id',
  EMAIL: 'cage_email',
} as const;

// ─── DOM Elements ──────────────────────────────────────────────────────────────

const stateLoggedOut = document.getElementById('state-logged-out') as HTMLDivElement;
const stateCheckEmail = document.getElementById('state-check-email') as HTMLDivElement;
const stateLoggedIn = document.getElementById('state-logged-in') as HTMLDivElement;

const loginForm = document.getElementById('login-form') as HTMLFormElement;
const emailInput = document.getElementById('email') as HTMLInputElement;
const loginError = document.getElementById('login-error') as HTMLParagraphElement;
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;

const sentEmail = document.getElementById('sent-email') as HTMLElement;
const resendBtn = document.getElementById('resend-btn') as HTMLButtonElement;
const resendTimer = document.getElementById('resend-timer') as HTMLSpanElement;
const backBtn = document.getElementById('back-btn') as HTMLButtonElement;

const statusBadge = document.getElementById('status-badge') as HTMLSpanElement;
const statusMessage = document.getElementById('status-message') as HTMLParagraphElement;
const userEmail = document.getElementById('user-email') as HTMLSpanElement;
const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement;

// ─── State ─────────────────────────────────────────────────────────────────────

let currentEmail = '';
let resendCooldown: ReturnType<typeof setInterval> | null = null;

// ─── View Switching ────────────────────────────────────────────────────────────

function showState(state: 'logged-out' | 'check-email' | 'logged-in') {
  stateLoggedOut.style.display = state === 'logged-out' ? 'block' : 'none';
  stateCheckEmail.style.display = state === 'check-email' ? 'block' : 'none';
  stateLoggedIn.style.display = state === 'logged-in' ? 'block' : 'none';
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

function updateStatusBadge(status: string) {
  statusBadge.className = 'badge';

  switch (status) {
    case 'approved':
      statusBadge.classList.add('badge-verified');
      statusBadge.textContent = 'Verified 18+';
      statusMessage.textContent =
        'Your age has been verified. Partner sites can confirm you meet their age requirements.';
      break;
    case 'pending':
      statusBadge.classList.add('badge-pending');
      statusBadge.textContent = 'Pending';
      statusMessage.textContent =
        'Your verification is being processed. This usually takes just a moment.';
      break;
    case 'declined':
      statusBadge.classList.add('badge-declined');
      statusBadge.textContent = 'Unsuccessful';
      statusMessage.textContent =
        'Your previous verification was unsuccessful. Visit cageid.app to try again.';
      break;
    case 'unreachable':
      statusBadge.classList.add('badge-error');
      statusBadge.textContent = 'Offline';
      statusMessage.textContent =
        'Could not reach the CAGE server. Check your connection and try again.';
      break;
    default:
      statusBadge.classList.add('badge-none');
      statusBadge.textContent = 'Not verified';
      statusMessage.textContent =
        'Visit cageid.app to verify your age and start using CAGE with partner sites.';
  }
}

// ─── API Calls ─────────────────────────────────────────────────────────────────

async function sendMagicLink(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${SERVER_URL}/auth/magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'extension' }),
    });

    if (res.status === 429) {
      return { ok: false, error: 'Too many requests. Please try again later.' };
    }
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      return { ok: false, error: data.error ?? 'Something went wrong.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not connect to CAGE server.' };
  }
}

type VerifyResult =
  | { ok: true; status: string }
  | { ok: false; reason: 'expired' | 'unreachable' };

async function fetchVerificationStatus(sessionId: string): Promise<VerifyResult> {
  try {
    const res = await fetch(`${SERVER_URL}/verify/status`, {
      headers: { Authorization: `Bearer ${sessionId}` },
    });

    if (res.status === 401) {
      return { ok: false, reason: 'expired' };
    }

    if (!res.ok) {
      return { ok: false, reason: 'unreachable' };
    }

    const data = (await res.json()) as { status: string };
    return { ok: true, status: data.status };
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}

// ─── Resend Cooldown ───────────────────────────────────────────────────────────

function startResendCooldown() {
  let seconds = 30;
  resendBtn.disabled = true;
  resendTimer.textContent = `(${seconds}s)`;

  resendCooldown = setInterval(() => {
    seconds--;
    if (seconds <= 0) {
      if (resendCooldown) clearInterval(resendCooldown);
      resendCooldown = null;
      resendBtn.disabled = false;
      resendTimer.textContent = '';
    } else {
      resendTimer.textContent = `(${seconds}s)`;
    }
  }, 1000);
}

// ─── Event Handlers ────────────────────────────────────────────────────────────

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.style.display = 'none';

  const email = emailInput.value.trim();
  if (!email) return;

  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending\u2026';

  const result = await sendMagicLink(email);

  if (!result.ok) {
    loginError.textContent = result.error ?? 'Something went wrong.';
    loginError.style.display = 'block';
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send Magic Link';
    return;
  }

  currentEmail = email;
  sentEmail.textContent = email;
  showState('check-email');
  startResendCooldown();
  sendBtn.disabled = false;
  sendBtn.textContent = 'Send Magic Link';
});

resendBtn.addEventListener('click', async () => {
  if (!currentEmail) return;
  resendBtn.disabled = true;
  const result = await sendMagicLink(currentEmail);
  if (!result.ok) {
    // Silent fail on resend — just restart cooldown
  }
  startResendCooldown();
});

backBtn.addEventListener('click', () => {
  if (resendCooldown) clearInterval(resendCooldown);
  resendCooldown = null;
  showState('logged-out');
  emailInput.value = '';
});

logoutBtn.addEventListener('click', async () => {
  await chrome.storage.local.remove([STORAGE_KEYS.SESSION_ID, STORAGE_KEYS.EMAIL]);
  loginError.style.display = 'none';
  showState('logged-out');
  emailInput.value = '';
});

// ─── Initialize ────────────────────────────────────────────────────────────────

async function init() {
  const data = await chrome.storage.local.get([STORAGE_KEYS.SESSION_ID, STORAGE_KEYS.EMAIL]);
  const sessionId = data[STORAGE_KEYS.SESSION_ID] as string | undefined;
  const email = data[STORAGE_KEYS.EMAIL] as string | undefined;

  if (sessionId && email) {
    // Logged in — show status
    userEmail.textContent = email;
    showState('logged-in');

    // Fetch verification status
    const result = await fetchVerificationStatus(sessionId);

    if (result.ok) {
      updateStatusBadge(result.status);
    } else if (result.reason === 'expired') {
      // Session expired — clear and show login with message
      await chrome.storage.local.remove([STORAGE_KEYS.SESSION_ID, STORAGE_KEYS.EMAIL]);
      showState('logged-out');
      loginError.textContent = 'Session expired. Please sign in again.';
      loginError.style.display = 'block';
    } else {
      // API unreachable — show logged-in state with error banner
      updateStatusBadge('unreachable');
    }
  } else {
    showState('logged-out');
  }
}

// Listen for session changes (from content script → background worker)
chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEYS.SESSION_ID]?.newValue) {
    // Session was just stored — refresh to logged-in state
    init();
  }
});

init();
