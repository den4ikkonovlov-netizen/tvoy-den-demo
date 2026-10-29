(() => {
  'use strict';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const header = document.querySelector('header');
  const menu = document.querySelector('.menu');
  const setMenu = (open) => {
    header.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  };
  menu.addEventListener('click', () => setMenu(!header.classList.contains('open')));
  header.querySelectorAll('nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('click', e => { if (!header.contains(e.target)) setMenu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && header.classList.contains('open')) { setMenu(false); menu.focus(); }
  });
  addEventListener('resize', () => { if (innerWidth > 1050) setMenu(false); }, { passive: true });
  header.querySelector('[data-open-request]').addEventListener('click', () => setMenu(false));

  // The pointer, gentle idle motion and scroll use separate nested layers.
  const hero = document.querySelector('.hero');
  let targetX = 0, targetY = 0, x = 0, y = 0, scroll = 0, frame = 0, inView = true, lastSceneTime = 0;
  function schedule() {
    if (!frame && !reducedMotion.matches && inView && !document.hidden) frame = requestAnimationFrame(renderScene);
  }
  function renderScene(time) {
    frame = 0;
    if (reducedMotion.matches || !inView || document.hidden) return;
    const bounds = hero.getBoundingClientRect();
    const targetScroll = Math.min(500, Math.max(0, -bounds.top));
    const dt = Math.min(40, lastSceneTime ? time - lastSceneTime : 16.7); lastSceneTime = time;
    const ease = 1 - Math.exp(-dt / 220);
    x += (targetX - x) * ease; y += (targetY - y) * ease; scroll += (targetScroll - scroll) * ease;
    hero.style.setProperty('--px', `${x.toFixed(2)}px`);
    hero.style.setProperty('--py', `${y.toFixed(2)}px`);
    hero.style.setProperty('--tilt', `${(x * .055).toFixed(3)}deg`);
    hero.style.setProperty('--travel', `${scroll.toFixed(2)}px`);
    if (Math.abs(targetX - x) + Math.abs(targetY - y) + Math.abs(targetScroll - scroll) > .06) schedule();
  }
  hero.addEventListener('pointermove', e => {
    if (!finePointer.matches || reducedMotion.matches) return;
    const r = hero.getBoundingClientRect();
    targetX = ((e.clientX - r.left) / r.width - .5) * 30;
    targetY = ((e.clientY - r.top) / r.height - .5) * 20;
    schedule();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { targetX = targetY = 0; schedule(); });
  addEventListener('scroll', schedule, { passive: true });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      hero.classList.toggle('motion-paused', !inView);
      lastSceneTime = 0; if (inView) schedule();
    });
    observer.observe(hero);
  }
  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('page-paused', document.hidden);
    lastSceneTime = 0; if (!document.hidden) schedule();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      cancelAnimationFrame(frame); frame = 0; x = y = scroll = targetX = targetY = 0;
      ['--px','--py','--travel'].forEach(v => hero.style.setProperty(v,'0px'));
      hero.style.setProperty('--tilt','0deg');
    } else schedule();
  });

  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    document.documentElement.classList.add('motion-ready');
    const reveals = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); reveals.unobserve(e.target); }
    }), { threshold: .08 });
    function observeReveals(selector) {
      document.querySelectorAll(selector).forEach((el, i) => {
        if (el.classList.contains('reveal')) return;
        el.classList.add('reveal');
        el.style.setProperty('--reveal-delay',`${el.matches('.package-card,.gallery>a,.parent-review,.program-card') ? (i % 3) * 110 : 0}ms`);
        reveals.observe(el);
      });
    }
    observeReveals('.section-head,.format-lead,.format-panel,.parent-review,.contact>div:not([aria-hidden]),.program-card');
    document.addEventListener('catalog-rendered', () => observeReveals('.program-card'));
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) document.documentElement.classList.remove('motion-ready');
    });
  }

  // Scroll depth: only visible decorations update, with time-based easing.
  // Stop scheduling frames once settled; never animate the text or the page itself.
  const layers = [...document.querySelectorAll('[data-drift]')].map(el => ({el,section:el.closest('section'),range:Number(el.dataset.drift),current:0,active:false}));
  let depthFrame = 0, lastDepthTime = 0;
  function scheduleDepth() {
    if (!depthFrame && !reducedMotion.matches && !document.hidden && layers.some(l=>l.active)) depthFrame=requestAnimationFrame(drawDepth);
  }
  function drawDepth(time) {
    depthFrame=0;
    if (reducedMotion.matches || document.hidden) return;
    const dt=Math.min(40,lastDepthTime ? time-lastDepthTime : 16.7);lastDepthTime=time;
    const ease=1-Math.exp(-dt/150);let moving=false;
    layers.forEach(l=>{
      if (!l.active) return;
      const r=l.section.getBoundingClientRect();
      const progress=Math.max(-1,Math.min(1,(innerHeight*.5-r.top-r.height*.5)/(innerHeight*.5+r.height*.5)));
      const target=progress*l.range*(innerWidth<750?.55:1);
      l.current+=(target-l.current)*ease;
      l.el.style.transform=`translate3d(0,${l.current.toFixed(2)}px,0)`;
      moving ||= Math.abs(target-l.current)>.1;
    });
    if (moving) scheduleDepth(); else lastDepthTime=0;
  }
  if ('IntersectionObserver' in window) {
    const depthObserver=new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        layers.filter(l=>l.section===e.target).forEach(l=>l.active=e.isIntersecting);
        e.target.classList.toggle('motion-paused',!e.isIntersecting);
      });scheduleDepth();
    },{rootMargin:'100px'});
    [...new Set(layers.map(l=>l.section))].forEach(section=>depthObserver.observe(section));
  }
  addEventListener('scroll',scheduleDepth,{passive:true});
  addEventListener('resize',scheduleDepth,{passive:true});
  document.addEventListener('visibilitychange',()=>{lastDepthTime=0;scheduleDepth();});
  reducedMotion.addEventListener('change',()=>{
    if (reducedMotion.matches) {cancelAnimationFrame(depthFrame);depthFrame=0;layers.forEach(l=>{l.current=0;l.el.style.transform='none';});}
    else {layers.forEach(l=>l.el.style.removeProperty('transform'));scheduleDepth();}
  });

  const formats = {
    birthday: { number:'01', tag:'ЕГО САМЫЙ ВАЖНЫЙ ДЕНЬ', title:'Сегодня всё<br>вокруг именинника.', text:'Позвать любимого героя, отправиться в квест или устроить шоу? Выбирайте то, что увлекает именно вашего ребёнка.', button:'Посмотреть пакеты', href:'#packages' },
    graduation: { number:'02', tag:'НОВОЕ ПРИКЛЮЧЕНИЕ ВПЕРЕДИ', title:'В новый этап.<br>Вместе с друзьями.', text:'Собрать друзей, наиграться вместе и отметить важный шаг. Обсудим возраст детей и подберём формат для вашей компании.', button:'Выбрать программу', href:'#catalog' },
    family: { number:'03', tag:'ХОРОШО, КОГДА ВСЕ ВМЕСТЕ', title:'Повод собраться.<br>И порадовать детей.', text:'Пусть в семейном празднике найдётся место детским приключениям. Поможем выбрать героя или шоу для маленьких гостей.', button:'Обсудить праздник', href:'#contacts' }
  };
  const tabs = [...document.querySelectorAll('[data-occasion]')];
  const panel = document.querySelector('#format-panel');
  function selectFormat(tab, focus = false) {
    const key = tab.dataset.occasion, content = formats[key];
    tabs.forEach(t => { t.setAttribute('aria-selected', String(t === tab)); t.tabIndex = t === tab ? 0 : -1; });
    panel.dataset.mode = key; panel.setAttribute('aria-labelledby',tab.id);
    panel.querySelector('.format-number').textContent = content.number;
    panel.querySelector('.format-tag').textContent = content.tag;
    panel.querySelector('h3').innerHTML = content.title;
    panel.querySelector('.format-text p').textContent = content.text;
    const link = panel.querySelector('a'); link.textContent = content.button; link.href = content.href;
    panel.classList.remove('is-changing'); void panel.offsetWidth; panel.classList.add('is-changing');
    if (focus) tab.focus();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectFormat(tab));
    tab.addEventListener('keydown', e => {
      let index;
      if (e.key === 'ArrowRight') index = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') index = (i + tabs.length - 1) % tabs.length;
      if (e.key === 'Home') index = 0;
      if (e.key === 'End') index = tabs.length - 1;
      if (index !== undefined) { e.preventDefault(); selectFormat(tabs[index], true); }
    });
  });

  const dialog = document.querySelector('#photo-dialog');
  const photo = dialog.querySelector('img');
  const moments = [
    {src:'images/studio-event.jpg',alt:'Представление для детей и родителей в студии Твой день'},
    {src:'images/family.jpg',alt:'Гости студии на детском представлении'}
  ];
  const portraits = [...document.querySelectorAll('.gallery img')].map(img => ({src:img.getAttribute('src'),alt:img.alt}));
  let activePhotos = moments, photoIndex = 0;
  function renderPhoto() {
    photo.src = activePhotos[photoIndex].src; photo.alt = activePhotos[photoIndex].alt;
    dialog.querySelector('.photo-count').textContent = `${photoIndex + 1} / ${activePhotos.length}`;
  }
  function openPhoto(list, index) {
    activePhotos = list; photoIndex = index; renderPhoto(); dialog.showModal();
    document.body.classList.add('photo-open');
  }
  document.querySelectorAll('[data-photo]').forEach(b => b.addEventListener('click', () => openPhoto(moments, Number(b.dataset.photo))));
  document.querySelectorAll('.gallery>a').forEach((a, i) => a.addEventListener('click', e => {e.preventDefault();openPhoto(portraits,i);}));
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => document.body.classList.remove('photo-open'));
  dialog.addEventListener('click', e => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
  });
  function changePhoto(direction) { photoIndex = (photoIndex + direction + activePhotos.length) % activePhotos.length; renderPhoto(); }
  dialog.querySelector('.photo-prev').addEventListener('click', () => changePhoto(-1));
  dialog.querySelector('.photo-next').addEventListener('click', () => changePhoto(1));
  dialog.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); changePhoto(e.key === 'ArrowRight' ? 1 : -1); }
  });
  const gallery = document.querySelector('.gallery');
  document.querySelectorAll('[data-gallery]').forEach(b => b.addEventListener('click', () => {
    const cards = [...gallery.querySelectorAll('a')];
    if (!cards.length) return;
    const step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : gallery.clientWidth;
    const direction = b.dataset.gallery === 'next' ? 1 : -1;
    const max = Math.max(0, gallery.scrollWidth - gallery.clientWidth);
    const current = gallery.scrollLeft;
    const target = Math.max(0, Math.min(max, current + direction * step * 2));
    gallery.scrollTo({ left: target, behavior:reducedMotion.matches ? 'instant' : 'smooth' });
  }));

})();
