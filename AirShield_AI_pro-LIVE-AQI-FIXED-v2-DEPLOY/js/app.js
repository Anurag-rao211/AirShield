/* ============================================================
   Boot
   ============================================================ */
function boot(){
  applyTheme(); applyLang();
  buildNav(); paintBell();
  setAutoRefresh(S.autoRefresh);
  if (!ROUTES[S.page]) S.page = 'dashboard';
  go(S.page);
  if (S.dataMode === 'api'){
    applyLiveData(S.city).then(ok => { rerender(); paintBell(); if (!ok) toast('LIVE AQI unavailable: check Vercel WAQI_TOKEN and /api/air-quality.', 'warn', ICON.info); });
  }

  $('#btnMenu').onclick = () => $('#sidebar').classList.contains('open') ? closeNav() : openNav();
  $('#btnCity').onclick = () => cityMenu($('#btnCity'));
  $('#btnLang').onclick = () => langMenu($('#btnLang'));
  $('#btnProfile').onclick = () => profileMenu($('#btnProfile'));
  $('#btnNotif').onclick = openNotifs;
  $('#btnRefreshTop').onclick = () => doRefresh(false);
  $('#aiFab').onclick = openAi;

  const si = $('#citySearch');
  si.addEventListener('input', e => searchSuggest(e.target.value));
  si.addEventListener('keydown', e => {
    if (e.key === 'Enter'){
      const q = e.target.value.trim().toLowerCase();
      const hit = CITY_KEYS.find(k => CITY_DEFS[k].name.toLowerCase().startsWith(q) || String(CITY_DEFS[k].hi||'').startsWith(q));
      if (hit){ $('#suggestBox').innerHTML = ''; e.target.value = ''; setCity(hit); }
      else { const loc = INDIA_LOCATION_CATALOG.find(x => (x.district+' '+x.state).toLowerCase().startsWith(q)); if(loc){ ensureLocationDef(loc.key,loc.district,loc.state,loc.district); $('#suggestBox').innerHTML=''; e.target.value=''; setCity(loc.key); } else if(q) toast('No catalogue match. Use the location menu to search live WAQI stations.', 'warn', ICON.info); }
    }
    if (e.key === 'Escape'){ $('#suggestBox').innerHTML = ''; e.target.blur(); }
  });
  document.addEventListener('mousedown', e => {
    if (!e.target.closest('.searchbox')) $('#suggestBox').innerHTML = '';
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 900) closeNav(); closePop(); });

  if (!window.Chart){
    toast('Charts could not load. Every other part of the prototype still works.', 'warn', ICON.info);
  }
}
window.addEventListener('error', e => {
  console.error(e.error || e.message);
});
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
