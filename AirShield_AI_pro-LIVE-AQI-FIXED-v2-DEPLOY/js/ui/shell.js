/* ============================================================
   Shell: navigation, overlays, toasts
   ============================================================ */
const PAGES = [
  {group:'grpMonitor', items:[
    {id:'dashboard', key:'navDashboard', icon:'dashboard'},
    {id:'map',       key:'navMap',       icon:'map'},
    {id:'reports',   key:'navReports',   icon:'reports'}
  ]},
  {group:'grpIntel', items:[
    {id:'hotspots',  key:'navHotspots',  icon:'ai'},
    {id:'forecast',  key:'navForecast',  icon:'forecast'},
    {id:'analytics', key:'navAnalytics', icon:'analytics'}
  ]},
  {group:'grpRespond', items:[
    {id:'alerts',    key:'navAlerts',    icon:'alerts'},
    {id:'infra',     key:'navInfra',     icon:'infra'},
    {id:'compare',   key:'navCompare',   icon:'compare'}
  ]},
  {group:'grpSystem', items:[
    {id:'data',      key:'navData',      icon:'network'},
    {id:'settings',  key:'navSettings',  icon:'settings'}
  ]}
];

function buildNav(){
  const nav = $('#nav'); nav.innerHTML = '';
  PAGES.forEach(g => {
    nav.appendChild(el('div','nav-group', esc(t(g.group))));
    g.items.forEach(it => {
      const b = el('button','nav-item' + (S.page === it.id ? ' active' : ''),
        ICON[it.icon] + '<span>' + esc(t(it.key)) + '</span>');
      b.type = 'button';
      if (it.id === 'alerts'){
        const open = allAlerts().filter(a => a.status === 'Open').length;
        if (open) b.insertAdjacentHTML('beforeend', '<span class="nav-badge">'+open+'</span>');
      }
      b.addEventListener('click', () => { go(it.id); closeNav(); });
      nav.appendChild(b);
    });
  });
}
function openNav(){ $('#sidebar').classList.add('open'); if(!$('#navScrim')){ const s = el('div','nav-scrim'); s.id='navScrim'; s.onclick = closeNav; document.body.appendChild(s);} }
function closeNav(){ $('#sidebar').classList.remove('open'); const s = $('#navScrim'); if (s) s.remove(); }

const charts = {};
function destroyCharts(){ Object.keys(charts).forEach(k => { try{ charts[k].destroy(); }catch(e){} delete charts[k]; }); }

const ROUTES = {};
function go(page){
  if (!ROUTES[page]) page = 'dashboard';
  S.page = page; save();
  destroyCharts(); closePop();
  buildNav();
  const v = $('#view'); v.innerHTML = '';
  ROUTES[page](v);
  v.scrollIntoView({block:'start'});
  window.scrollTo({top:0});
}
function rerender(){ go(S.page); }

/* toasts */
function toast(msg, kind='ok', icon){
  const box = $('#toasts');
  const n = el('div','toast '+kind, (icon || ICON.check) + '<div>'+esc(msg)+'</div>');
  box.appendChild(n);
  setTimeout(() => { n.style.transition='opacity .25s, transform .25s'; n.style.opacity='0'; n.style.transform='translateY(6px)'; setTimeout(()=>n.remove(),260); }, 3400);
}

/* modal */
let escHandler = null;
function modal({title, sub, body, foot, wide}){
  closeModal();
  const scrim = el('div','scrim');
  scrim.id = 'scrim';
  const m = el('div','modal' + (wide ? ' wide' : ''));
  m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true');
  m.innerHTML =
    '<div class="modal-head"><div style="flex:1"><h3>'+title+'</h3>' + (sub ? '<div class="tiny muted" style="margin-top:4px">'+sub+'</div>' : '') + '</div>' +
    '<button class="icon-btn" data-close aria-label="'+esc(t('close'))+'" style="width:32px;height:32px">'+ICON.close+'</button></div>' +
    '<div class="modal-body">'+body+'</div>' + (foot ? '<div class="modal-foot">'+foot+'</div>' : '');
  scrim.appendChild(m);
  $('#overlayRoot').appendChild(scrim);
  scrim.addEventListener('mousedown', e => { if (e.target === scrim) closeModal(); });
  $$('[data-close]', m).forEach(b => b.addEventListener('click', closeModal));
  escHandler = e => { if (e.key === 'Escape') closeModal(); };
  document.addEventListener('keydown', escHandler);
  const first = m.querySelector('input,select,textarea,button:not([data-close])');
  if (first) setTimeout(()=>first.focus(), 40);
  return m;
}
function closeModal(){
  const s = $('#scrim'); if (s) s.remove();
  if (escHandler){ document.removeEventListener('keydown', escHandler); escHandler = null; }
}

/* drawer (notifications) */
function closeDrawer(){ const d = $('#drawer'); if (d) d.remove(); const s = $('#drawerScrim'); if (s) s.remove(); }
function drawer(title, bodyHtml, footHtml){
  closeDrawer();
  const scrim = el('div','scrim'); scrim.id='drawerScrim'; scrim.style.zIndex='205';
  scrim.addEventListener('mousedown', e => { if (e.target === scrim) closeDrawer(); });
  const d = el('div','drawer'); d.id='drawer';
  d.innerHTML = '<div class="drawer-head"><h3 style="flex:1">'+title+'</h3>' +
    '<button class="icon-btn" data-dclose style="width:32px;height:32px">'+ICON.close+'</button></div>' +
    '<div class="drawer-body">'+bodyHtml+'</div>' + (footHtml ? '<div class="drawer-foot">'+footHtml+'</div>' : '');
  $('#overlayRoot').appendChild(scrim);
  $('#overlayRoot').appendChild(d);
  $$('[data-dclose]', d).forEach(b => b.onclick = closeDrawer);
  return d;
}

/* ---------- notifications ---------- */
function baseNotifs(){
  const d = city(), out = [];
  const top = d.hotspots[0];
  if (top) out.push({ id:'nf-hot-'+S.city, icon:'ai', tone:'--vpoor', title:'New critical hotspot detected', body: top.name + ' — ' + top.source + ' (' + top.confidence + '% confidence)', ts: Date.now()-14*60000 });
  out.push({ id:'nf-fc-'+S.city, icon:'forecast', tone:'--poor', title:'Forecast indicates an AQI spike', body:'Model expects a rise between 18:00 and 22:00 in ' + cityName(S.city) + '.', ts: Date.now()-38*60000 });
  const rep = d.reports[0];
  if (rep) out.push({ id:'nf-rep-'+rep.id, icon:'reports', tone:'--accent', title:'Citizen report received', body: rep.location + ' — ' + typeLabel(rep.kind), ts: rep.ts });
  out.push({ id:'nf-ack-'+S.city, icon:'check', tone:'--good', title:'Response team acknowledged alert', body:'Field Response Team A is en route.', ts: Date.now()-92*60000 });
  out.push({ id:'nf-sen-'+S.city, icon:'sensor', tone:'--moderate', title:'Sensor offline', body: (d.sensors.find(s=>!s.online)||d.sensors[0]).id + ' stopped reporting.', ts: Date.now()-140*60000 });
  return out;
}
function notifList(){
  return S.extraNotifs.concat(baseNotifs())
    .filter(n => !S.dismissedNotifs.includes(n.id))
    .sort((a,b) => b.ts - a.ts);
}
function unreadCount(){ return notifList().filter(n => !S.readNotifs.includes(n.id)).length; }
function paintBell(){
  const c = $('#notifCount'), n = S.notifOn ? unreadCount() : 0;
  c.hidden = n === 0; c.textContent = n;
}
function pushNotif(title, body, tone='--accent', icon='alerts'){
  S.extraNotifs.unshift({ id:'nf-u-'+Date.now()+'-'+Math.round(Math.random()*999), icon, tone, title, body, ts:Date.now() });
  S.extraNotifs = S.extraNotifs.slice(0, 30);
  save(); paintBell();
}
function openNotifs(){
  const list = notifList();
  const body = list.length ? list.map(n => {
    const unread = !S.readNotifs.includes(n.id);
    return '<div class="notif'+(unread?' unread':'')+'" data-nid="'+n.id+'">' +
      '<span class="n-ic" style="color:var('+n.tone+');background:color-mix(in srgb,var('+n.tone+') 15%,transparent)">'+ICON[n.icon]+'</span>' +
      '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:.86rem">'+esc(n.title)+'</div>' +
      '<div class="tiny muted" style="margin-top:2px">'+esc(n.body)+'</div>' +
      '<div class="tiny" style="color:var(--fg-3);margin-top:4px">'+ago(n.ts)+'</div></div></div>';
  }).join('') : '<div class="empty">'+esc(t('noNotifs'))+'</div>';
  const d = drawer(esc(t('notifTitle')), body,
    '<div style="display:flex;gap:8px"><button class="btn btn-sm" id="markAll" style="flex:1">'+ICON.check+esc(t('markAll'))+'</button>' +
    '<button class="btn btn-sm" data-dclose>'+esc(t('close'))+'</button></div>');
  $$('.notif', d).forEach(row => row.onclick = () => {
    const id = row.dataset.nid;
    if (!S.readNotifs.includes(id)) S.readNotifs.push(id);
    save(); row.classList.remove('unread'); paintBell();
  });
  const ma = $('#markAll', d);
  if (ma) ma.onclick = () => {
    notifList().forEach(n => { if (!S.readNotifs.includes(n.id)) S.readNotifs.push(n.id); });
    save(); paintBell(); $$('.notif', d).forEach(r => r.classList.remove('unread'));
    toast(t('markAll') + ' — ' + t('saved'));
  };
}

/* ---------- India location catalogue ---------- */
function ensureLocationDef(key,name,state='',waqiQuery='',uid=''){
  if(CITY_DEFS[key]) return key;
  const safeName=String(name||'Location');
  CITY_DEFS[key]={name:safeName,hi:safeName,base:150,temp:27,hum:55,wind:8,pop:'—',river:'—',state,waqiQuery:waqiQuery||safeName,waqiUid:uid||null,areas:[safeName+' city centre',safeName+' market',safeName+' transport corridor',safeName+' residential area',safeName+' industrial area',safeName+' outer road']};
  CITY_KEYS.push(key);
  return key;
}
function catalogueLocationHits(q){
  const query=String(q||'').trim().toLowerCase(); if(!query)return [];
  return INDIA_LOCATION_CATALOG.filter(x=>(x.district+' '+x.state).toLowerCase().includes(query)).slice(0,12);
}

/* ---------- theme / language / city ---------- */
function applyTheme(){ document.documentElement.setAttribute('data-theme', S.theme); }
function applyLang(){
  document.documentElement.lang = S.lang;
  $('#langLabel').textContent = S.lang === 'hi' ? 'हिं' : 'EN';
  $$('[data-i18n]').forEach(n => n.textContent = t(n.dataset.i18n));
  $$('[data-i18n-ph]').forEach(n => n.placeholder = t(n.dataset.i18nPh));
  $('#cityLabel').textContent = cityName(S.city);
}
function setCity(k){
  if (!CITY_DEFS[k]) return;
  S.city = k; save();
  $('#cityLabel').textContent = cityName(k);
  rerender();
  toast(cityName(k) + ' — ' + t('refreshed'), 'ok', ICON.target);
  if (S.dataMode === 'api') applyLiveData(k).then(ok => { rerender(); paintBell(); if (!ok) toast(t('apiFail'), 'warn', ICON.info); });
}
function cityMenu(anchor){
  const old=$('#cityMenu'); if(old){old.remove();return;}
  const body='<div class="grid g-2" style="gap:12px">'+
    '<div class="card" style="box-shadow:none"><div class="card-head"><h3>India location explorer</h3><span class="chip">'+INDIA_STATES.length+' States/UTs · '+INDIA_DISTRICT_TOTAL+' districts</span></div>'+
    '<label class="field"><span>State / Union Territory</span><select id="locState"><option value="">Select state / UT</option>'+INDIA_STATES.map(st=>'<option>'+esc(st)+'</option>').join('')+'</select></label>'+
    '<label class="field"><span>District</span><select id="locDistrict" disabled><option value="">Select district</option></select></label>'+
    '<div class="tiny muted">Districts are administrative locations. AirShield shows live AQI only when WAQI has a monitoring station for the selected location.</div></div>'+
    '<div class="card" style="box-shadow:none"><div class="card-head"><h3>WAQI city / station search</h3><span class="chip">Live coverage</span></div>'+
    '<input class="field" id="waqiLocationSearch" placeholder="Search any Indian city or station…" autocomplete="off"><div id="waqiLocationResults" class="suggest" style="position:relative;top:auto;left:auto;right:auto;margin-top:8px;box-shadow:none"></div></div>'+
    '<div class="card" style="box-shadow:none;grid-column:1/-1"><div class="card-head"><h3>Quick cities</h3><span class="tiny muted">Dashboard locations</span></div><div class="toolbar">'+CITY_KEYS.slice(0,20).map(k=>'<button class="btn btn-sm" data-quick-city="'+esc(k)+'">'+esc(cityName(k))+'</button>').join('')+'</div></div>'+
    '</div>';
  const m=modal({title:'AirShield India locations',sub:'Choose a state and district or search the live WAQI station directory.',body,foot:'<button class="btn" data-close>'+esc(t('close'))+'</button>',wide:true});
  const state=$('#locState',m),district=$('#locDistrict',m);
  state.onchange=()=>{const list=indiaDistrictsForState(state.value);district.disabled=!list.length;district.innerHTML='<option value="">Select district</option>'+list.map(d=>'<option>'+esc(d)+'</option>').join('')};
  district.onchange=()=>{if(!district.value)return;const key=(state.value+'-'+district.value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');ensureLocationDef(key,district.value,state.value,district.value);closeModal();setCity(key);};
  $$('[data-quick-city]',m).forEach(b=>b.onclick=()=>{closeModal();setCity(b.dataset.quickCity)});
  const input=$('#waqiLocationSearch',m),out=$('#waqiLocationResults',m);let timer=null;
  input.oninput=()=>{clearTimeout(timer);const q=input.value.trim();if(q.length<3){out.innerHTML='';return}timer=setTimeout(async()=>{out.innerHTML='<div class="empty">Searching WAQI…</div>';try{const results=await searchLiveLocations(q);out.innerHTML=results.length?results.map((r,i)=>'<button class="btn" data-waqi-index="'+i+'" style="display:flex;width:100%;justify-content:space-between;margin-bottom:6px;text-align:left"><span><b>'+esc(r.name)+'</b><br><span class="tiny muted">Station '+esc(String(r.uid))+' · AQI '+esc(String(r.aqi))+'</span></span><span>'+ICON.target+'</span></button>').join(''):'<div class="empty">No Indian WAQI station found for this search.</div>';$$('[data-waqi-index]',out).forEach(b=>b.onclick=()=>{const r=results[Number(b.dataset.waqiIndex)];const key='waqi-'+r.uid;ensureLocationDef(key,r.name,'',r.name,r.uid);closeModal();setCity(key)});}catch(e){out.innerHTML='<div class="empty">'+esc(e.message)+'</div>'}},300)};
}

function langMenu(anchor){
  const old = $('#langMenu'); if (old){ old.remove(); return; }
  const m = el('div','menu'); m.id='langMenu'; m.style.minWidth='170px';
  m.innerHTML = '<button data-l="en">English</button><button data-l="hi">हिन्दी (Hindi)</button>';
  anchor.parentElement.appendChild(m);
  $$('button', m).forEach(b => b.onclick = () => {
    m.remove(); S.lang = b.dataset.l; save(); applyLang(); rerender();
  });
  setTimeout(() => document.addEventListener('mousedown', function h(e){
    if (!m.contains(e.target)){ m.remove(); document.removeEventListener('mousedown', h); }
  }), 0);
}
function profileMenu(anchor){
  const old = $('#profMenu'); if (old){ old.remove(); return; }
  const m = el('div','menu'); m.id='profMenu';
  m.innerHTML =
    '<div class="menu-head"><div class="tiny muted">'+esc(t('signedIn'))+'</div>' +
    '<div style="font-weight:600">Asha Mehrotra</div><div class="tiny muted">Control room operator · ' + esc(cityName(S.city)) + '</div></div>' +
    '<button data-a="profile">'+ICON.user+esc(t('viewProfile'))+'</button>' +
    '<button data-a="settings">'+ICON.settings+esc(t('navSettings'))+'</button>' +
    '<button data-a="theme">'+(S.theme==='dark'?ICON.sun:ICON.moon)+esc(t('theme'))+': '+esc(S.theme==='dark'?t('dark'):t('light'))+'</button>' +
    '<button data-a="out">'+ICON.logout+esc(t('signOut'))+'</button>';
  anchor.parentElement.appendChild(m);
  $$('button', m).forEach(b => b.onclick = () => {
    m.remove();
    const a = b.dataset.a;
    if (a === 'settings') go('settings');
    else if (a === 'theme'){ S.theme = S.theme === 'dark' ? 'light' : 'dark'; save(); applyTheme(); rerender(); }
    else if (a === 'profile') modal({
      title: esc(t('profile')),
      body:'<div style="display:flex;gap:14px;align-items:center;margin-bottom:14px">' +
        '<div style="width:52px;height:52px;border-radius:16px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-weight:700">AM</div>' +
        '<div><div style="font-weight:600">Asha Mehrotra</div><div class="tiny muted">Control room operator</div></div></div>' +
        '<div class="stat-row"><span>Role</span><b>Operator (demo account)</b></div>' +
        '<div class="stat-row"><span>Jurisdiction</span><b>'+esc(cityName(S.city))+'</b></div>' +
        '<div class="stat-row"><span>Alerts dispatched</span><b>'+S.alerts.length+'</b></div>' +
        '<div class="stat-row"><span>Reports filed</span><b>'+Object.values(S.reports).reduce((a,v)=>a+v.length,0)+'</b></div>',
      foot:'<button class="btn" data-close>'+esc(t('close'))+'</button>'
    });
    else toast('This demo account stays signed in.', 'warn', ICON.info);
  });
  setTimeout(() => document.addEventListener('mousedown', function h(e){
    if (!m.contains(e.target)){ m.remove(); document.removeEventListener('mousedown', h); }
  }), 0);
}

/* ---------- global refresh ---------- */
let refreshTimer = null;
async function doRefresh(silent){
  if (S.dataMode === 'api'){
    const ok = await applyLiveData(S.city);
    if (!ok) toast(t('apiFail'), 'warn', ICON.info);
  } else {
    jitterCity(S.city);
  }
  rerender(); paintBell();
  if (!silent) toast(t('refreshed'), 'ok', ICON.sensor);
}
function setAutoRefresh(on){
  if (refreshTimer){ clearInterval(refreshTimer); refreshTimer = null; }
  if (on) refreshTimer = setInterval(() => doRefresh(true), 30000);
}

/* ---------- city search ---------- */
function searchSuggest(q){
  const box=$('#suggestBox');box.innerHTML='';const query=String(q||'').trim().toLowerCase();if(!query)return;
  const hits=[];CITY_KEYS.forEach(k=>{if(CITY_DEFS[k].name.toLowerCase().includes(query)||(CITY_DEFS[k].hi||'').toLowerCase().includes(query))hits.push({label:cityName(k),sub:'Dashboard city',k})});
  catalogueLocationHits(query).forEach(x=>{if(hits.length<10)hits.push({label:x.district,sub:x.state+' · India district',k:x.key,state:x.state,district:x.district})});
  if(!hits.length){box.innerHTML='<div class="suggest"><div class="empty" style="padding:16px">No catalogue match. Use the location menu to search the live WAQI station directory.</div></div>';return}
  const wrap=el('div','suggest');wrap.innerHTML=hits.slice(0,10).map((h,i)=>'<button data-i="'+i+'"><div style="font-weight:500">'+esc(h.label)+'</div><div class="tiny muted">'+esc(h.sub)+'</div></button>').join('');box.appendChild(wrap);
  $$('button',wrap).forEach((b,i)=>b.onclick=()=>{const h=hits[i];box.innerHTML='';$('#citySearch').value='';if(h.district)ensureLocationDef(h.k,h.district,h.state,h.district);setCity(h.k)});
}

/* ---------- downloads ---------- */
function download(filename, text, mime='text/plain'){
  try{
    const blob = new Blob([text], {type: mime + ';charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = el('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(t('downloaded') + ' ' + filename, 'ok', ICON.download);
  }catch(e){
    toast('Download blocked by the browser. Copy the data from the table instead.', 'warn', ICON.info);
  }
}
function toCsv(rows){
  return rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g,'""') + '"').join(',')).join('\n');
}

