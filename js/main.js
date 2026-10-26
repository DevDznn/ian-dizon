/* Ian Dizon — Portfolio
 * Progressive enhancements only: every section and link works without this file.
 *   1. Theme toggle (light / dark, remembered in localStorage)
 *   2. Mobile navigation
 *   3. Project filters
 *   4. Header state + active section in the nav
 *   5. Typed role in the hero
 *   6. Scroll reveals
 *   7. Footer year
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var STORAGE_KEY = 'theme';
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- 1. Theme ------------------------------------------------ */
  var storage = {
    get: function () {
      try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
    },
    set: function (value) {
      try { localStorage.setItem(STORAGE_KEY, value); } catch (e) { /* private mode etc. — the choice lasts for this page view */ }
    }
  };

  var toggle = document.querySelector('[data-theme-toggle]');

  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function syncToggle() {
    if (!toggle) return;
    var dark = currentTheme() === 'dark';
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }

  function setTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    if (persist) storage.set(theme);
    syncToggle();
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      setTheme(currentTheme() === 'dark' ? 'light' : 'dark', true);
    });
  }

  // Follow OS changes only while the visitor has not made an explicit choice.
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onSystemChange = function (e) {
      if (!storage.get()) setTheme(e.matches ? 'dark' : 'light', false);
    };
    if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
    else if (mq.addListener) mq.addListener(onSystemChange);
  }

  syncToggle();
  // Enable colour transitions after first paint so the initial load never animates.
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.add('theme-ready'); });
  });

  /* ---------- 2. Mobile navigation ----------------------------------- */
  var menuButton = document.querySelector('[data-menu-button]');
  var menu = document.querySelector('[data-menu]');

  if (menuButton && menu) {
    menu.hidden = false; // CSS (visibility/opacity) takes over from the hidden attribute

    var setMenu = function (open) {
      menu.classList.toggle('is-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        var first = menu.querySelector('a');
        if (first) first.focus();
      }
    };
    var isOpen = function () { return menu.classList.contains('is-open'); };

    menuButton.addEventListener('click', function () { setMenu(!isOpen()); });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') {
        setMenu(false);
        menuButton.focus();
        return;
      }
      // Keep keyboard focus inside the open menu (menu links + the close button)
      if (e.key === 'Tab') {
        var items = [menuButton].concat(Array.prototype.slice.call(menu.querySelectorAll('a')));
        var idx = items.indexOf(document.activeElement);
        if (e.shiftKey && idx <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && idx === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });

    // Close if the viewport grows past the mobile breakpoint
    var desktop = window.matchMedia('(min-width: 768px)');
    var onBreakpoint = function (e) { if (e.matches && isOpen()) setMenu(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onBreakpoint);
    else if (desktop.addListener) desktop.addListener(onBreakpoint);
  }

  /* ---------- 3. Project filters ------------------------------------- */
  var filterGroup = document.querySelector('[data-filters]');
  var projects = Array.prototype.slice.call(document.querySelectorAll('[data-projects] .project'));
  var status = document.querySelector('[data-filter-status]');

  if (filterGroup && projects.length) {
    filterGroup.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-filter]');
      if (!btn) return;
      var filter = btn.getAttribute('data-filter');

      Array.prototype.forEach.call(filterGroup.querySelectorAll('[data-filter]'), function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });

      var shown = 0;
      projects.forEach(function (p) {
        var cats = (p.getAttribute('data-category') || '').split(/\s+/);
        var match = filter === 'all' || cats.indexOf(filter) !== -1;
        var wasHidden = p.hidden;
        p.hidden = !match;
        p.classList.remove('is-entering');
        if (match) {
          shown++;
          if (wasHidden) {
            // The card's own entrance replaces any scroll reveal still pending inside it
            Array.prototype.forEach.call(p.querySelectorAll('.reveal'), function (el) { el.classList.remove('reveal'); });
            void p.offsetWidth; // restart the entrance animation
            p.classList.add('is-entering');
          }
        }
      });

      // Staggered offsets only make sense for the full, two-column rhythm.
      document.querySelector('[data-projects]').classList.toggle('is-filtered', filter !== 'all');

      if (status) {
        status.textContent = 'Showing ' + shown + ' project' + (shown === 1 ? '' : 's') + ': ' + btn.firstChild.textContent.trim() + '.';
      }
    });
  }

  /* ---------- 4. Header + active nav --------------------------------- */
  var header = document.querySelector('[data-header]');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));
  if ('IntersectionObserver' in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = byId[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach(function (a) { a.removeAttribute('aria-current'); });
          link.setAttribute('aria-current', 'true');
        } else if (link.getAttribute('aria-current')) {
          link.removeAttribute('aria-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    Object.keys(byId).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  /* ---------- 5. Typed role ------------------------------------------ */
  // The markup already holds the first role, which is what shows without JS or with
  // reduced motion. Screen readers get that static text; the animated copy is hidden from them.
  var typed = document.querySelector('[data-typed]');
  if (typed && !reduceMotion) {
    var phrases = typed.getAttribute('data-typed').split('|');
    var label = typed.textContent.trim();

    typed.textContent = '';
    var srText = document.createElement('span');
    srText.className = 'sr-only';
    srText.textContent = label;
    var box = document.createElement('span');
    box.className = 'typed-box';
    box.setAttribute('aria-hidden', 'true');
    phrases.forEach(function (phrase) {
      var sizer = document.createElement('span');
      sizer.className = 'typed-sizer';
      sizer.textContent = phrase;
      box.appendChild(sizer);
    });
    var live = document.createElement('span');
    var text = document.createElement('span');
    var cursor = document.createElement('span');
    cursor.className = 'typed-cursor';
    live.appendChild(text);
    live.appendChild(cursor);
    box.appendChild(live);
    typed.appendChild(srText);
    typed.appendChild(box);

    var TYPE_MS = 85, DELETE_MS = 45, HOLD_MS = 2200, GAP_MS = 450;
    var index = 0, length = phrases[0].length, deleting = true;
    var timer = null, onScreen = true;
    text.textContent = phrases[0];

    var step = function () {
      timer = null;
      var delay;
      if (deleting) {
        length--;
        if (length <= 0) { deleting = false; index = (index + 1) % phrases.length; delay = GAP_MS; }
        else delay = DELETE_MS;
      } else {
        length++;
        if (length >= phrases[index].length) { deleting = true; delay = HOLD_MS; }
        else delay = TYPE_MS + Math.random() * 40;
      }
      text.textContent = phrases[index].slice(0, length);
      // Keep the caret solid while characters change; let it blink during pauses
      typed.classList.toggle('is-busy', delay < GAP_MS);
      timer = setTimeout(step, delay);
    };

    // Only run while the hero is on screen and the tab is visible
    var sync = function () {
      var run = onScreen && !document.hidden;
      typed.classList.toggle('is-paused', !run);
      if (run && !timer) timer = setTimeout(step, deleting && length === phrases[index].length ? HOLD_MS : TYPE_MS);
      else if (!run && timer) { clearTimeout(timer); timer = null; }
    };
    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        sync();
      }).observe(typed);
    }
    sync();
  }

  /* ---------- 6. Scroll reveals -------------------------------------- */
  // Targets: [data-reveal] elements, direct children of [data-reveal-children], and the
  // parts of each project. Only elements that start off screen are hidden, and they are
  // revealed by an IntersectionObserver, so nothing waits on scroll events.
  var revealTargets = Array.prototype.slice.call(
    document.querySelectorAll('[data-reveal], [data-reveal-children] > *, [data-projects] > .project > *')
  );

  if (!reduceMotion && 'IntersectionObserver' in window && revealTargets.length) {
    var finishReveal = function (e) {
      var el = e.currentTarget;
      if (e.target !== el || e.propertyName !== 'opacity') return;
      el.removeEventListener('transitionend', finishReveal);
      el.classList.remove('reveal', 'is-visible');
      el.style.transitionDelay = '';
    };

    var revealObserver = new IntersectionObserver(function (entries) {
      // Elements arriving together are staggered in document order
      entries
        .filter(function (entry) { return entry.isIntersecting; })
        .map(function (entry) { return entry.target; })
        .sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; })
        .forEach(function (el, i) {
          revealObserver.unobserve(el);
          if (!el.classList.contains('reveal')) return;
          el.style.transitionDelay = Math.min(i, 4) * 80 + 'ms';
          el.addEventListener('transitionend', finishReveal);
          el.classList.add('is-visible');
        });
    }, { rootMargin: '0px 0px -6% 0px' });

    var viewportH = window.innerHeight || root.clientHeight;
    revealTargets.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < viewportH && rect.bottom > 0) return; // already visible: leave it alone
      el.classList.add('reveal');
      revealObserver.observe(el);
    });
  }

  /* ---------- 7. Footer year ----------------------------------------- */
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
