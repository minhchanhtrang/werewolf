// auth.js — Authentication logic for Ma Sói · Đêm bên lửa trại
// Updated: DOM IDs now use #screen-login / #screen-lobby etc.
// All auth logic preserved; only DOM targeting updated.

const form          = document.querySelector("#authForm");
const loginButton   = document.querySelector("#loginButton");
const registerButton= document.querySelector("#registerButton");
const logoutButton  = document.querySelector("#logoutButton");
const username      = document.querySelector("#username");
const password      = document.querySelector("#password");
const confirmation  = document.querySelector("#passwordConfirmation");
const confirmationLabel = document.querySelector("#confirmationLabel");
const switchButton  = document.querySelector("#switchAuth");
const message       = document.querySelector("#authMessage");
const account       = document.querySelector("#accountName");
let registering = false;

export const authState = { user: null };

async function api(route, body) {
  const response = await fetch("/api/auth/" + route, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Yêu cầu thất bại.");
  return data;
}

function showUser(user) {
  authState.user = user;

  // Screen visibility: login screen ↔ app screens
  const loginScreen = document.querySelector("#screen-login");
  const lobbyScreen = document.querySelector("#screen-lobby");

  // Hide / show login screen
  loginScreen.hidden = Boolean(user);

  // The lobby/waiting/game screens are managed by lobby.js render().
  // Here we just ensure lobby is visible when logged in
  // and hide it when not (lobby.js will further switch between sub-screens).
  if (!user) {
    // Not logged in: hide all app screens
    if (lobbyScreen) lobbyScreen.hidden = true;
    document.querySelector("#screen-waiting").hidden = true;
    document.querySelector("#screen-game").hidden = true;
  }
  // If logged in, lobby.js render() handles which app screen to show.

  document.body.classList.toggle("in-game", Boolean(user));

  // Update account name in all screens
  const displayName = user
    ? user.username
    : "Khách";

  if (account) account.textContent = displayName;

  // Mirror account name to waiting/game bars if they exist
  const accountNameWaiting = document.querySelector("#accountName-waiting");
  const accountNameGame    = document.querySelector("#accountName-game");
  if (accountNameWaiting) accountNameWaiting.textContent = displayName;
  if (accountNameGame)    accountNameGame.textContent    = displayName;

  // Update accountStatus areas
  const accountStatus = document.querySelector("#accountStatus");
  if (accountStatus) accountStatus.textContent = "";
  const accountStatusGame = document.querySelector("#accountStatus-game");
  if (accountStatusGame) accountStatusGame.textContent = "";

  // Show / hide logout buttons on all screens
  const logoutBtnWaiting = document.querySelector("#logoutButton-waiting");
  const logoutBtnGame    = document.querySelector("#logoutButton-game");
  if (logoutButton)      logoutButton.hidden      = !user;
  if (logoutBtnWaiting)  logoutBtnWaiting.hidden  = !user;
  if (logoutBtnGame)     logoutBtnGame.hidden      = !user;

  // Form elements on login screen
  if (form)         form.hidden         = Boolean(user);
  if (switchButton) switchButton.hidden = Boolean(user);

  // Clear sensitive fields
  if (password)     password.value     = "";
  if (confirmation) confirmation.value = "";

  // Dispatch account change for lobby.js to react
  window.dispatchEvent(new CustomEvent("accountchange", { detail: user }));

  // Focus management
  if (user) {
    if (account) {
      account.tabIndex = -1;
      account.focus({ preventScroll: true });
    }
    window.dispatchEvent(new Event("resize"));
  } else {
    if (username) username.focus({ preventScroll: true });
  }
}

function setMode(value) {
  registering = value;
  const heading = document.querySelector("#accountHeading");
  if (heading) heading.textContent = registering ? "Tạo tài khoản" : "Đăng nhập";
  if (confirmationLabel) confirmationLabel.hidden = !registering;
  if (confirmation)      confirmation.required    = registering;
  if (password)          password.autocomplete    = registering ? "new-password" : "current-password";
  if (loginButton)       loginButton.hidden        = registering;
  if (registerButton)    registerButton.hidden     = !registering;
  if (switchButton)      switchButton.textContent  = registering
    ? "Đã có tài khoản? Đăng nhập"
    : "Chưa có tài khoản? Đăng ký";
  if (message) message.textContent = "";
}

// ── Logout handler (also wired for extra logout buttons on other screens) ──

async function doLogout() {
  const buttons = [
    document.querySelector("#logoutButton"),
    document.querySelector("#logoutButton-waiting"),
    document.querySelector("#logoutButton-game"),
  ].filter(Boolean);
  buttons.forEach(b => { b.disabled = true; });
  try {
    await api("logout", {});
    showUser(null);
    if (message) message.textContent = "Đã đăng xuất. Đăng nhập lại để trở về phòng.";
  } catch (error) {
    const statusEl = document.querySelector("#accountStatus");
    if (statusEl) statusEl.textContent = error.message;
  } finally {
    buttons.forEach(b => { b.disabled = false; });
  }
}

if (switchButton)  switchButton.addEventListener("click", () => setMode(!registering));
if (logoutButton)  logoutButton.addEventListener("click", doLogout);

// Extra logout buttons on other screens
const logoutBtnWaiting = document.querySelector("#logoutButton-waiting");
const logoutBtnGame    = document.querySelector("#logoutButton-game");
if (logoutBtnWaiting) logoutBtnWaiting.addEventListener("click", doLogout);
if (logoutBtnGame)    logoutBtnGame.addEventListener("click", doLogout);

if (form) {
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (registering && password.value !== confirmation.value) {
      if (message) message.textContent = "Hai mật khẩu chưa khớp.";
      return;
    }
    if (loginButton)   loginButton.disabled   = true;
    if (registerButton) registerButton.disabled = true;
    if (switchButton)  switchButton.disabled  = true;
    if (message) message.textContent = "Đang xử lý…";
    try {
      const data = await api(registering ? "register" : "login", {
        username: username.value.trim(), password: password.value
      });
      if (registering) {
        setMode(false);
        if (password)     password.value     = "";
        if (confirmation) confirmation.value = "";
        if (message) message.textContent = data.message;
        if (password) password.focus();
      } else {
        showUser(data.user);
        if (message) message.textContent = "Đăng nhập thành công.";
      }
    } catch (error) {
      if (message) message.textContent = error.message;
    } finally {
      if (loginButton)    loginButton.disabled    = false;
      if (registerButton) registerButton.disabled = false;
      if (switchButton)   switchButton.disabled   = false;
    }
  });
}

// ── Initialise ──────────────────────────────────────────────────────────────
showUser(null);

window.addEventListener("sessionexpired", () => {
  showUser(null);
  if (message) message.textContent = "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.";
});

api("me")
  .then(data => showUser(data.user))
  .catch(error => { if (message) message.textContent = error.message; });
