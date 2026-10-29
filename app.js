(() => {
  'use strict';
  const services = window.PARTY_SERVICES;
  const byId = new Map(services.map(s => [s.id,s]));
  const categories = {show:'Шоу',play:'Игры и приключения',extra:'Дополнительно',kids:'Для малышей',package:'Праздник под ключ'};
  const money = n => n.toLocaleString('ru-RU') + ' ₽';
  const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let selected = new Set();
  try { const stored=JSON.parse(localStorage.getItem('tvoy-den-request')||'[]'); if(Array.isArray(stored)) selected = new Set(stored.filter(id=>byId.has(id))); } catch {}
  let category='all',query='',limit=6,activeId=null,toastTimer;
  const grid=document.querySelector('#items');
  const detail=document.querySelector('#service-dialog');
  const request=document.querySelector('#request-dialog');
  const form=document.querySelector('#request-form');
  const ready=document.querySelector('#request-ready');
  const toast=text=>{const t=document.querySelector('.toast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2300);};
  function renderCatalogue(){
    const found=services.filter(s=>s.category!=='package'&&(category==='all'||s.category===category)&&`${s.name} ${s.summary}`.toLowerCase().includes(query));
    grid.innerHTML=found.slice(0,limit).map((s,i)=>`<article class="program-card" style="--card-delay:${i%6*45}ms"><button class="program-picture" data-detail="${s.id}" aria-label="Подробнее: ${esc(s.name)}"><img src="${s.image}" alt="${esc(s.name)} — фото студии Твой день" loading="lazy" width="540" height="540"><span class="program-badge">${categories[s.category]}</span><span class="picture-open">Смотреть программу</span></button><div class="program-body"><div class="program-meta">${esc(s.duration||s.tag)}</div><h3><button data-detail="${s.id}">${esc(s.name)}</button></h3><p>${esc(s.summary)}</p><div class="program-bottom"><span class="program-price">${money(s.price)}<small>${esc(s.unit)}</small></span><button class="program-add ${selected.has(s.id)?'selected':''}" data-add="${s.id}" aria-pressed="${selected.has(s.id)}" aria-label="${selected.has(s.id)?'Убрать из заявки':'Добавить в заявку'}: ${esc(s.name)}">${selected.has(s.id)?'В заявке':'В заявку'} <span aria-hidden="true">${selected.has(s.id)?'✓':'+'}</span></button></div></div></article>`).join('');
    document.dispatchEvent(new CustomEvent('catalog-rendered'));
    document.querySelector('.catalog-result').textContent=`${found.length} программ · показано ${Math.min(limit,found.length)}`;
    document.querySelector('.catalog-empty').hidden=found.length!==0;
    document.querySelector('#catalog-more').hidden=limit>=found.length;
    document.querySelector('#catalog-more').textContent=`Ещё программы (${Math.max(0,found.length-limit)})`;
  }
  const packLists=[['Студия на 2 часа','Аниматор — 1 час','Сервировка на 10 персон'],['Студия на 3 часа','Аниматор — 1 час','Шоу — 30 минут или ростовая кукла — 20 минут'],['Студия на 3 часа','Аниматор + шоу','Аквагрим и фотограф — по 1 часу']];
  document.querySelector('#package-cards').innerHTML=services.filter(s=>s.category==='package').map((s,i)=>`<article class="package-card"><span class="package-seal" aria-hidden="true">${["2 часа","3 часа","3 часа"][i]}</span><span class="package-index">0${i+1} / ГОТОВЫЙ ПРАЗДНИК</span><h3>${s.name}</h3><p>${s.summary}</p><ul>${packLists[i].map(x=>`<li>${x}</li>`).join('')}</ul><strong>${money(s.price)}</strong><button class="button ${i===1?'primary':'secondary'}" data-detail="${s.id}">Посмотреть состав</button></article>`).join('');
  const photos=Array.from({length:8},(_,i)=>`images/heroes/hero-${i+1}.webp`);
  document.querySelector('#gallery').innerHTML=photos.map((src,i)=>`<a href="https://vk.ru/album-59537402_260766519"><img src="${src}" alt="Аниматор студии Твой день, фото ${i+1}" loading="eager" decoding="async"><span>Посмотреть ближе</span></a>`).join('');
  function sync(){
    document.querySelectorAll('[data-request-count]').forEach(x=>x.textContent=selected.size);
    document.querySelector('.request-float').hidden=selected.size===0;
    document.querySelectorAll('[data-add]').forEach(b=>{const on=selected.has(b.dataset.add),s=byId.get(b.dataset.add);b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',`${on?'Убрать из заявки':'Добавить в заявку'}: ${s.name}`);b.innerHTML=`${on?'В заявке':'В заявку'} <span aria-hidden="true">${on?'✓':'+'}</span>`;});
    if(activeId)document.querySelector('#service-add').textContent=selected.has(activeId)?'Убрать из заявки':'Добавить в заявку';
    try{localStorage.setItem('tvoy-den-request',JSON.stringify([...selected]));}catch{}
    renderRequestItems();
  }
  function toggle(id){if(!byId.has(id))return;if(selected.has(id)){selected.delete(id);toast('Убрано из заявки');}else{selected.add(id);toast('Добавлено в ваш праздник');}sync();if(request.open)editRequest();}
  function openDialog(d){d.showModal();document.body.classList.add('modal-open');}
  function showService(id){
    const s=byId.get(id);if(!s)return;activeId=id;
    document.querySelector('#service-title').textContent=s.name;
    document.querySelector('#service-category').textContent=categories[s.category];
    const img=document.querySelector('#service-image');img.src=s.image;img.alt=s.name;
    document.querySelector('.service-facts').innerHTML=[s.duration,s.tag].filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join('');
    document.querySelector('.service-summary').textContent=s.summary;
    document.querySelector('.service-description').textContent=s.description;
    document.querySelector('#service-source').href=s.url;
    document.querySelector('#service-price').textContent=money(s.price);
    document.querySelector('#service-unit').textContent=s.unit;
    sync();openDialog(detail);detail.scrollTop=0;
  }
  document.querySelector('#service-add').addEventListener('click',()=>toggle(activeId));
  function renderRequestItems(){
    document.querySelector('#request-items').innerHTML=selected.size?[...selected].map(id=>{const s=byId.get(id);return `<div class="request-line"><img src="${s.image}" alt=""><div><strong>${esc(s.name)}</strong><span>${money(s.price)} ${esc(s.unit)}</span></div><button data-remove="${id}" aria-label="Убрать ${esc(s.name)}">×</button></div>`;}).join('')+'<p class="request-estimate">Это список пожеланий. Состав и стоимость праздника согласует администратор: некоторые услуги уже входят в пакеты.</p>':'<div class="request-empty">Можно начать с идеи — или выбрать программы в каталоге.<button type="button" id="request-to-catalog">Посмотреть программы</button></div>';
  }
  function editRequest(){form.hidden=false;ready.hidden=true;document.querySelector('.copy-status').textContent='';}
  document.addEventListener('click',e=>{
    const d=e.target.closest('[data-detail]');if(d)showService(d.dataset.detail);
    const a=e.target.closest('[data-add]');if(a)toggle(a.dataset.add);
    const r=e.target.closest('[data-remove]');if(r)toggle(r.dataset.remove);
    if(e.target.closest('[data-open-request]')){renderRequestItems();editRequest();openDialog(request);request.scrollTop=0;}
    if(e.target.closest('#request-to-catalog')){request.close();document.querySelector('#catalog').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  });
  [detail,request].forEach(d=>{
    d.querySelector('[data-close-dialog]').addEventListener('click',()=>d.close());
    d.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))document.body.classList.remove('modal-open');});
    d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});
  });
  document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{
    category=b.dataset.filter;limit=6;document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderCatalogue();
  }));
  document.querySelector('#program-search').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();limit=6;renderCatalogue();});
  document.querySelector('#catalog-more').addEventListener('click',()=>{limit+=6;renderCatalogue();});
  document.querySelector('#reset-catalog').addEventListener('click',()=>{query='';document.querySelector('#program-search').value='';document.querySelector('[data-filter="all"]').click();});
  form.addEventListener('submit',e=>{
    e.preventDefault();if(!form.reportValidity())return;
    const fields=new FormData(form);const lines=['Здравствуйте! Хочу обсудить праздник в студии «Твой день».'];
    if(fields.get('name').trim())lines.push('Меня зовут '+fields.get('name').trim()+'.');
    if(fields.get('date'))lines.push('Дата: '+fields.get('date').split('-').reverse().join('.'));
    if(fields.get('age'))lines.push('Возраст ребёнка: '+fields.get('age'));
    if(fields.get('guests'))lines.push('Количество детей: '+fields.get('guests'));
    if(selected.size)lines.push('\nИнтересуют программы:\n'+[...selected].map(id=>'• '+byId.get(id).name).join('\n'));
    if(fields.get('wishes').trim())lines.push('\nПожелания: '+fields.get('wishes').trim());
    lines.push('\nПодскажите, пожалуйста, свободна ли дата, какой состав программы подойдёт и какая будет итоговая стоимость?');
    document.querySelector('#request-message').value=lines.join('\n');form.hidden=true;ready.hidden=false;ready.scrollIntoView({block:'nearest'});
  });
  document.querySelector('#edit-request').addEventListener('click',editRequest);
  document.querySelector('#copy-request').addEventListener('click',async()=>{
    const area=document.querySelector('#request-message');const status=document.querySelector('.copy-status');
    try{await navigator.clipboard.writeText(area.value);status.textContent='Текст скопирован. Откройте ВКонтакте и вставьте его в сообщение студии.';}catch{area.focus();area.select();status.textContent='Выделили текст. Скопируйте его вручную и отправьте студии.';}
  });
  renderCatalogue();sync();
})();
