// Run in the document head, before game modules and media finish loading.
// Explicitly cancel a pending page exit even when auth/UI initialization is slow.
(() => {
  function reconnect() {
    fetch('/api/rooms/reconnect', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }, body: '{}', keepalive: true
    }).catch(() => {});
  }
  reconnect();
  window.addEventListener('pageshow', event => { if (event.persisted) reconnect(); });
})();
