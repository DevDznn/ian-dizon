/* Ian Dizon — Portfolio
 * Progressive enhancements only: every section and link works without this file.
 *   1. Theme toggle (light / dark, remembered in localStorage)
 *   2. Mobile navigation
 *   3. Project filters
 *   4. Header state + active section in the nav
 *   5. Footer year
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var STORAGE_KEY = 'theme';

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

  /* ---------- 5. Footer year ----------------------------------------- */
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
