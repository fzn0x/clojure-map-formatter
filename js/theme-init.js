// Apply a saved theme before first paint. Loaded from <head>, so it stays tiny.
try {
  const t = localStorage.getItem('cmf:theme');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
} catch (e) { /* storage blocked: follow the system theme */ }
