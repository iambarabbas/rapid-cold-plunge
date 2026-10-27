(() => {
  const S = { door: 'perform', tile: null, menu: false, exp: false, scrolled: false };
  const mqWide = matchMedia('(min-width:920px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function vals() {
    const p = S.door === 'perform', wide = mqWide.matches;
    return {
      heatCast: S.tile === 'heat' ? .7 : 0, coldCast: S.tile === 'cold' ? .7 : 0,
      isPerform: p, isUnwind: !p,
      pOp: p ? 1 : 0, uOp: p ? 0 : 1, pCast: p ? .6 : 0, uCast: p ? 0 : .5, pScale: p ? 1 : 1.06, uScale: p ? 1.06 : 1,
      doorTag: p ? 'Cold · 38–55°F' : 'Heat · 160–195°F',
      pColor: p ? '#F1E6D4' : 'rgba(241,230,212,.38)', uColor: p ? 'rgba(241,230,212,.38)' : '#F1E6D4',
      pLine: p ? '#A8CCC3' : 'rgba(241,230,212,.14)', uLine: p ? 'rgba(241,230,212,.14)' : '#A8CCC3',
      navBg: S.scrolled || S.menu ? 'rgba(13,10,7,.88)' : 'rgba(13,10,7,0)',
      navLine: S.scrolled ? 'rgba(241,230,212,.08)' : 'rgba(241,230,212,0)',
      menuOpen: !wide && S.menu, expOpen: S.exp, menuIcon: S.menu ? '✕' : '☰',
    };
  }

  function render() {
    const v = vals();
    document.querySelectorAll('[data-st]').forEach(el => {
      el.style.cssText = el.dataset.st.replace(/\{\{\s*([\w.$]+)\s*\}\}/g, (m, k) => v[k] ?? '');
    });
    document.querySelectorAll('[data-v]').forEach(el => { if (el.dataset.v in v) el.textContent = v[el.dataset.v]; });
    document.querySelectorAll('[data-if]').forEach(el => { if (el.dataset.if in v) el.hidden = !v[el.dataset.if]; });
  }

  function faq(btn) {
    const item = btn.parentElement, ans = item.querySelector('[data-faq-a]');
    const open = ans.hidden;
    if (document.body.dataset.faq === 'single') {
      item.parentElement.querySelectorAll('[data-faq-a]').forEach(a => {
        if (a !== ans) { a.hidden = true; a.previousElementSibling.lastElementChild.textContent = '+'; }
      });
    }
    ans.hidden = !open;
    btn.lastElementChild.textContent = open ? '−' : '+';
  }

  const actions = {
    setPerform: () => { S.door = 'perform'; }, setUnwind: () => { S.door = 'unwind'; },
    heatOn: () => { S.tile = 'heat'; }, coldOn: () => { S.tile = 'cold'; }, tileOff: () => { S.tile = null; },
    toggleMenu: () => { S.menu = !S.menu; },
    openExp: () => { S.exp = true; }, closeExp: () => { S.exp = false; },
  };

  [['click', 'click'], ['mouseenter', 'mouseenter'], ['mouseleave', 'mouseleave']].forEach(([attr, evt]) => {
    document.querySelectorAll('[data-' + attr + ']').forEach(el => {
      el.addEventListener(evt, () => {
        const a = el.dataset[attr];
        if (a === 'faq') return faq(el);
        if (actions[a]) { actions[a](); render(); }
      });
    });
  });

  function parallax() {
    if (reduced) return;
    const vh = innerHeight;
    document.querySelectorAll('[data-parallax]').forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = ((r.top + r.height / 2) - vh / 2) / vh;
      el.style.transform = `translateY(${(p * -6).toFixed(2)}%) scale(1.14)`;
    });
  }

  addEventListener('scroll', () => {
    const s = scrollY > 40;
    if (s !== S.scrolled) { S.scrolled = s; render(); }
    parallax();
  }, { passive: true });
  mqWide.addEventListener('change', () => { if (mqWide.matches) S.menu = false; render(); });

  if (!reduced) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.animate([{ opacity: 0, transform: 'translateY(28px)' }, { opacity: 1, transform: 'none' }],
        { duration: 1100, delay: +(el.dataset.delay || 0), easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' });
      io.unobserve(el);
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
    document.querySelectorAll('[data-kenburns]').forEach(el => el.animate([{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 18000, easing: 'cubic-bezier(.2,.6,.2,1)', fill: 'both' }));
    document.querySelectorAll('[data-pulse]').forEach(el => el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: .35, transform: 'scale(.7)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 2400, iterations: Infinity, easing: 'ease-in-out' }));
    document.querySelectorAll('[data-marquee]').forEach(el => el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }], { duration: 48000, iterations: Infinity, easing: 'linear' }));
  }

  S.scrolled = scrollY > 40;
  render();
  parallax();
})();
