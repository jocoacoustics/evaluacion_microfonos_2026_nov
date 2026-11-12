/* PAPIRO • Navegación editorial y barra contextual. No requiere servidor. */
document.addEventListener('DOMContentLoaded', () => {
  const article = document.getElementById('article-scroll');
  const sidebar = document.getElementById('sidebar-scroll');
  const bar = document.getElementById('context-bar');
  const thumb = document.getElementById('context-thumb');
  const mobile = document.getElementById('mobile-index-toggle');
  if (!article || !sidebar || !bar || !thumb) return;
  let activePane = null, hideTimer = null, pendingNav = false;
  const isDesktop = () => window.matchMedia('(min-width:1031px)').matches;
  const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sections = Array.from(sidebar.querySelectorAll('a[href^="#"]'));
  const topLinks = Array.from(document.querySelectorAll('.top-link'));
  function articlePosition(el) {
    return el.getBoundingClientRect().top - article.getBoundingClientRect().top + article.scrollTop;
  }
  function updateBar() {
    if (!activePane || !isDesktop()) return;
    const visible = activePane.clientHeight, total = activePane.scrollHeight;
    if (total <= visible + 2) { bar.classList.remove('visible'); return; }
    const track = bar.clientHeight;
    const h = Math.max(35, track * Math.min(1, visible / total));
    const progress = Math.min(1, Math.max(0, activePane.scrollTop / (total - visible)));
    thumb.style.height = `${h}px`;
    thumb.style.transform = `translateY(${(track-h)*progress}px)`;
  }
  function setContext(pane) {
    if (!isDesktop()) return;
    activePane = pane;
    bar.classList.add('visible');
    clearTimeout(hideTimer);
    updateBar();
  }
  function maybeHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!article.matches(':hover') && !sidebar.matches(':hover')) bar.classList.remove('visible');
    }, 220);
  }
  [article, sidebar].forEach(pane => {
    pane.addEventListener('mouseenter', () => setContext(pane));
    pane.addEventListener('mousemove', () => setContext(pane), {passive:true});
    pane.addEventListener('mouseleave', maybeHide);
    pane.addEventListener('scroll', updateBar, {passive:true});
  });
  function navItems() {
    return sections.map(link => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      return target ? {link, target, position: isDesktop() ? articlePosition(target) : target.getBoundingClientRect().top + window.scrollY} : null;
    }).filter(Boolean).sort((a,b) => a.position - b.position);
  }
  function setCurrent() {
    const y = isDesktop() ? article.scrollTop + 140 : window.scrollY + 160;
    const items = navItems();
    let current = items[0];
    for (const item of items) {
      if (item.position <= y) current = item;
      else break;
    }
    sections.forEach(a => {
      const on = !!(current && current.link === a);
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    // Sólo mantiene activo el botón superior si corresponde a la sección visible.
    const anchor = current ? current.link.getAttribute('href') : '#resumen';
    const group = (anchor.startsWith('#figure-')) ? '#figure-1' :
                  (anchor.startsWith('#table-')) ? '#table-1' :
                  (anchor === '#metodologia') ? '#metodologia' : '#resumen';
    topLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === group));
    pendingNav = false;
  }
  function scheduleNav() {
    if (pendingNav) return;
    pendingNav = true;
    requestAnimationFrame(setCurrent);
  }
  function goToId(id) {
    const target = document.getElementById(id);
    if (!target) return false;
    const behavior = prefersReduced() ? 'auto' : 'smooth';
    if (isDesktop()) article.scrollTo({top: Math.max(0, articlePosition(target) - 20), behavior});
    else target.scrollIntoView({behavior, block:'start'});
    if (window.history && window.history.replaceState) window.history.replaceState(null, '', '#' + encodeURIComponent(id));
    if (mobile) { mobile.setAttribute('aria-expanded','false'); sidebar.classList.remove('mobile-open'); }
    return true;
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const id = decodeURIComponent(link.getAttribute('href').slice(1));
      if (goToId(id)) event.preventDefault();
    });
  });
  if (mobile) mobile.addEventListener('click', () => {
    const open = sidebar.classList.toggle('mobile-open');
    mobile.setAttribute('aria-expanded', String(open));
  });
  article.addEventListener('scroll', scheduleNav, {passive:true});
  window.addEventListener('scroll', scheduleNav, {passive:true});
  sidebar.addEventListener('scroll', updateBar, {passive:true});
  window.addEventListener('resize', () => { scheduleNav(); updateBar(); }, {passive:true});
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sidebar.classList.contains('mobile-open')) {
      sidebar.classList.remove('mobile-open'); if (mobile) mobile.setAttribute('aria-expanded', 'false');
    }
  });
  if (window.location.hash) {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    setTimeout(() => goToId(hash), 200);
  }
  setCurrent();
});
