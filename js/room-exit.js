// Send outside the regular polling queue so a busy request cannot delay leaving.
export function installRoomExit(getRoom, {
  events = window,
  beacon = navigator.sendBeacon?.bind(navigator),
  request = fetch
} = {}) {
  let queuedCode = null;
  function leave() {
    const code = getRoom()?.code;
    if (!code || queuedCode === code) return;
    const body = JSON.stringify({ roomCode: code, pageExit: true });
    try {
      if (beacon?.('/api/rooms/disconnect', new Blob([body], { type: 'application/json' }))) {
        queuedCode = code;
        return;
      }
    } catch { /* Try a keepalive request if the browser rejects the beacon. */ }
    try {
      queuedCode = code;
      Promise.resolve(request('/api/rooms/disconnect', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body, keepalive: true
      })).then(response => {
        if (!response.ok && queuedCode === code) queuedCode = null;
      }).catch(() => { if (queuedCode === code) queuedCode = null; });
    } catch { queuedCode = null; }
  }
  // beforeunload runs earlier on desktop; pagehide also covers navigation and bfcache.
  // Neither handler opens a confirmation prompt.
  events.addEventListener('beforeunload', leave);
  events.addEventListener('pagehide', leave);
  events.addEventListener('pageshow', () => { queuedCode = null; });
}
