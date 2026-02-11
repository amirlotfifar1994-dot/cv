/*
  boot-resize.js
  Why this exists:
  Some components (especially responsive charts) size themselves using ResizeObserver.
  If the initial layout is still "settling" (CSS still applying, scrollbar changes, fonts, etc.),
  charts can end up measured at 0 or an unstable size until the first user interaction
  causes a reflow/resize. This script forces a few early resize passes so everything
  is correct on first paint.
*/

(function () {
  function fireResize() {
    try {
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('orientationchange'));
      // Some libs listen on the document for visibility/layout changes.
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new Event('visibilitychange'));
      }
    } catch (_) {
      // Ancient browsers can cope without it.
    }
  }

  function kick() {
    // Multiple passes: immediate, next frame, and a couple of delayed passes.
    fireResize();
    requestAnimationFrame(fireResize);
    setTimeout(fireResize, 50);
    setTimeout(fireResize, 250);
    setTimeout(fireResize, 750);
  }

  // Run as early as reasonable.
  if (document.readyState === 'complete') {
    kick();
  } else {
    window.addEventListener('load', kick, { once: true });
    document.addEventListener('DOMContentLoaded', kick, { once: true });
  }

  // If fonts load after first paint, layout can shift.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      setTimeout(kick, 0);
    }).catch(function () {});
  }

  // React mounts after the DOM is parsed; watch for initial subtree changes briefly.
  var root = document.getElementById('root');
  if (root && 'MutationObserver' in window) {
    var mo = new MutationObserver(function () {
      kick();
    });
    mo.observe(root, { childList: true, subtree: true });
    setTimeout(function () {
      try { mo.disconnect(); } catch (_) {}
    }, 2000);
  }

  // The real culprit for "not responsive until click" is usually sizing based on container width.
  // A ResizeObserver on #root gives charts a reliable nudge whenever layout changes.
  if (root && 'ResizeObserver' in window) {
    var raf = 0;
    var ro = new ResizeObserver(function () {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        fireResize();
      });
    });
    try { ro.observe(root); } catch (_) {}
    window.addEventListener('beforeunload', function () {
      try { ro.disconnect(); } catch (_) {}
    }, { once: true });
  }
})();
