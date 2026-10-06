/* Run before layout: every new document starts with the sealed invitation. */
(() => {
  history.scrollRestoration = 'manual';
  if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  // Also covers non-GSAP pages and back/forward cache restoration.
  addEventListener('pageshow', () => {
    history.scrollRestoration = 'manual';
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  });
})();
