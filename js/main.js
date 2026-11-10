/* Ian Dizon — Portfolio
 * Progressive enhancements only: every section and link works without this file.
 *   1. Theme toggle (light / dark, remembered in localStorage)
 *   2. Mobile navigation
 *   3. Header state, active section + sliding nav indicator
 *   4. Project rail (prev/next, counter, progress, mouse drag)
 *   5. Project filters
 *   6. Scroll reveals (+ manifesto highlight, process connector)
 *   7. Footer year
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var STORAGE_KEY = 'theme';
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var hasIO = 'IntersectionObserver' in window;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  /* ---------- 1. Theme ------------------------------------------------ */
  var storage = {
    get: function () { try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(STORAGE_KEY, v); } catch (e) { /* lasts for this page view */ } }
  };
  var toggle = $('[data-theme-toggle]');
  var currentTheme = function () { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; };
  var syncToggle = function () {
    if (!toggle) return;
    var dark = currentTheme() === 'dark';
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  };
  var setTheme = function (theme, persist) {
    root.setAttribute('data-theme', theme);
    if (persist) storage.set(theme);
    syncToggle();
  };
  if (toggle) toggle.addEventListener('click', function () { setTheme(currentTheme() === 'dark' ? 'light' : 'dark', true); });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onSystem = function (e) { if (!storage.get()) setTheme(e.matches ? 'dark' : 'light', false); };
    if (mq.addEventListener) mq.addEventListener('change', onSystem); else if (mq.addListener) mq.addListener(onSystem);
  }
  syncToggle();
  requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('theme-ready'); }); });

  /* ---------- 2. Mobile navigation ----------------------------------- */
  var menuButton = $('[data-menu-button]');
  var menu = $('[data-menu]');
  if (menuButton && menu) {
    menu.hidden = false; // CSS (visibility/opacity) takes over from here
    var isOpen = function () { return menu.classList.contains('is-open'); };
    var setMenu = function (open) {
      menu.classList.toggle('is-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) { var first = $('a', menu); if (first) first.focus(); }
    };
    menuButton.addEventListener('click', function () { setMenu(!isOpen()); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { setMenu(false); menuButton.focus(); return; }
      if (e.key === 'Tab') { // keep focus inside the open menu
        var items = [menuButton].concat($$('a', menu));
        var idx = items.indexOf(document.activeElement);
        if (e.shiftKey && idx <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && idx === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    var desktop = window.matchMedia('(min-width: 900px)');
    var onBp = function (e) { if (e.matches && isOpen()) setMenu(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onBp); else if (desktop.addListener) desktop.addListener(onBp);
  }

  /* ---------- 3. Header + active nav --------------------------------- */
  var header = $('[data-header]');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 40); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  var navWrap = $('[data-nav-wrap]');
  var indicator = $('[data-nav-indicator]');
  var navLinks = $$('[data-nav]');
  var activeLink = null;

  // Moves the pill under the active link (or hides it when no section is active)
  var placeIndicator = function (link) {
    if (!indicator) return;
    if (!link || !link.offsetWidth) { indicator.classList.remove('is-on'); return; }
    indicator.style.width = link.offsetWidth + 'px';
    indicator.style.transform = 'translateX(' + link.offsetLeft + 'px)';
    indicator.classList.add('is-on');
  };
  if (navWrap && indicator) {
    navWrap.classList.add('has-indicator');
    window.addEventListener('resize', function () { placeIndicator(activeLink); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placeIndicator(activeLink); });
  }

  if (hasIO && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var setActive = function (link) {
      activeLink = link;
      navLinks.forEach(function (a) { if (a !== link) a.removeAttribute('aria-current'); });
      if (link) link.setAttribute('aria-current', 'true');
      placeIndicator(link);
    };
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = byId[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) setActive(link);
        else if (link === activeLink) setActive(null);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) sectionObserver.observe(s);
    });
  }

  /* ---------- 4. Project rail ---------------------------------------- */
  var rail = $('[data-rail]');
  var prevBtn = $('[data-rail-prev]');
  var nextBtn = $('[data-rail-next]');
  var countEl = $('[data-rail-count]');
  var progressEl = $('[data-rail-progress]');

  var visibleCards = function () { return $$('.project', rail).filter(function (p) { return !p.hidden; }); };

  // Index of the card whose left edge is closest to the rail's snap line
  var currentIndex = function (cards) {
    var snap = rail.getBoundingClientRect().left + parseFloat(getComputedStyle(rail).scrollPaddingLeft || 0);
    var best = 0, bestDist = Infinity;
    cards.forEach(function (c, i) {
      var d = Math.abs(c.getBoundingClientRect().left - snap);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  };

  var updateRail = function () {
    if (!rail) return;
    var cards = visibleCards();
    var max = rail.scrollWidth - rail.clientWidth;
    var atStart = rail.scrollLeft <= 2;
    var atEnd = rail.scrollLeft >= max - 2;
    var i = atEnd ? cards.length - 1 : currentIndex(cards);
    if (countEl) countEl.textContent = pad(cards.length ? i + 1 : 0) + ' / ' + pad(cards.length);
    if (prevBtn) prevBtn.disabled = atStart;
    if (nextBtn) nextBtn.disabled = atEnd || max <= 0;
    if (progressEl) {
      var p = max > 0 ? rail.scrollLeft / max : 1;
      var min = cards.length ? 1 / cards.length : 1;
      progressEl.style.setProperty('--progress', String(min + (1 - min) * p));
    }
  };

  var goTo = function (dir) {
    var cards = visibleCards();
    if (!cards.length) return;
    var i = Math.max(0, Math.min(cards.length - 1, currentIndex(cards) + dir));
    var snap = rail.getBoundingClientRect().left + parseFloat(getComputedStyle(rail).scrollPaddingLeft || 0);
    rail.scrollBy({ left: cards[i].getBoundingClientRect().left - snap, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  if (rail) {
    var ticking = false;
    rail.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; updateRail(); });
    }, { passive: true });
    window.addEventListener('resize', updateRail);
    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(1); });
    updateRail();

    // Mouse drag to scroll (touch and trackpads already scroll natively)
    var drag = null;
    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      if (e.target.closest('a, button, summary, input, select, textarea')) return;
      drag = { x: e.clientX, left: rail.scrollLeft, moved: false, id: e.pointerId };
    });
    rail.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 6) {
        drag.moved = true;
        rail.classList.add('is-dragging');
        try { rail.setPointerCapture(drag.id); } catch (err) { /* ignore */ }
      }
      if (drag.moved) rail.scrollLeft = drag.left - dx;
    });
    var endDrag = function () {
      if (!drag) return;
      var moved = drag.moved;
      drag = null;
      if (!moved) return;
      rail.classList.remove('is-dragging');
      goTo(0); // settle on the nearest card
    };
    rail.addEventListener('pointerup', endDrag);
    rail.addEventListener('pointercancel', endDrag);
    rail.addEventListener('dragstart', function (e) { e.preventDefault(); }); // no ghost-dragging of images
  }

  /* ---------- 5. Project filters ------------------------------------- */
  var filterGroup = $('[data-filters]');
  var projects = rail ? $$('.project', rail) : [];
  var status = $('[data-filter-status]');
  if (filterGroup && projects.length) {
    filterGroup.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-filter]');
      if (!btn) return;
      var filter = btn.getAttribute('data-filter');
      $$('[data-filter]', filterGroup).forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });

      var shown = 0;
      projects.forEach(function (p) {
        var cats = (p.getAttribute('data-category') || '').split(/\s+/);
        var match = filter === 'all' || cats.indexOf(filter) !== -1;
        p.hidden = !match;
        p.classList.remove('is-entering', 'reveal', 'is-visible');
        if (match) {
          shown++;
          if (!reduceMotion) { void p.offsetWidth; p.classList.add('is-entering'); }
        }
      });
      rail.scrollLeft = 0;
      updateRail();
      if (status) status.textContent = 'Showing ' + shown + ' project' + (shown === 1 ? '' : 's') + ': ' + btn.firstChild.textContent.trim() + '.';
    });
  }

  /* ---------- 6. Scroll reveals -------------------------------------- */
  // Targets: [data-reveal], direct children of [data-reveal-children], and each project card.
  // Only elements that start off screen are hidden, so nothing flashes or stays hidden at load.
  var revealTargets = $$('[data-reveal], [data-reveal-children] > *, [data-rail] > .project');

  if (!reduceMotion && hasIO && revealTargets.length) {
    var finish = function (e) {
      var el = e.currentTarget;
      if (e.target !== el || e.propertyName !== 'opacity') return;
      el.removeEventListener('transitionend', finish);
      el.classList.remove('reveal', 'is-visible');
      el.style.transitionDelay = '';
    };
    var revealObserver = new IntersectionObserver(function (entries) {
      entries
        .filter(function (en) { return en.isIntersecting; })
        .map(function (en) { return en.target; })
        .sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; })
        .forEach(function (el, i) {
          revealObserver.unobserve(el);
          if (!el.classList.contains('reveal')) return;
          el.style.transitionDelay = Math.min(i, 4) * 90 + 'ms';
          el.addEventListener('transitionend', finish);
          el.classList.add('is-visible');
        });
    }, { rootMargin: '0px 0px -8% 0px' });

    var vh = window.innerHeight || root.clientHeight;
    var vw = window.innerWidth || root.clientWidth;
    revealTargets.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0 && r.left < vw && r.right > 0) return; // already on screen
      el.classList.add('reveal');
      revealObserver.observe(el);
    });
  }

  // One-shot "in view" classes: manifesto highlights and the process connector line
  var oneShot = function (el, cls, margin) {
    if (!el) return;
    if (reduceMotion || !hasIO) { el.classList.add(cls); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { el.classList.add(cls); io.disconnect(); }
    }, { rootMargin: margin });
    io.observe(el);
  };
  oneShot($('[data-manifesto]'), 'is-lit', '0px 0px -30% 0px');
  oneShot($('[data-steps]'), 'is-drawn', '0px 0px -25% 0px');

  /* ---------- 7. Footer year ----------------------------------------- */
  var year = $('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
