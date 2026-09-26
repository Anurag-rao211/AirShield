/* ============================================================
   Page: Data & federation
   ============================================================ */
let SYNCED = 6;
ROUTES.data = function(v){
  const isApi = S.dataMode === 'api';
  const steps = [
    ['Citizen reports', 'Photos and descriptions filed from the AirShield app', 'demo', 'reports'],
    ['Air quality sensors & API', 'Live WAQI stations and local ward PM monitors', isApi ? 'live' : 'demo', 'sensor'],
    ['Satellite data', 'Aerosol optical depth tiles, resampled to 1 km', 'demo', 'target'],
    ['Meteorological data', 'Live wind, humidity, temperature and boundary layer height', isApi ? 'live' : 'wind'],
    ['AI / federated analytics', 'Scoring on the city node; only weights leave the city', 'demo', 'ai'],
    ['Hotspot detection', 'Clusters ranked by confidence and population exposure', 'demo', 'map'],
    ['AQI forecast', '24-hour prediction per ward', 'demo', 'forecast'],
    ['Authority alert', 'Routed to the responsible agency with a recommendation', 'demo', 'alerts'],
    ['Rapid response', 'Team assignment, acknowledgement and closure', 'demo', 'check']
  ];
  v.innerHTML =
    pageHead(t('dataTitle'), t('dataSub'), '') +
    '<div class="split">' +
      '<div class="card"><div class="card-head"><h2>'+esc(t('pipeline'))+'</h2>' +
        '<div><span class="chip tag-live">'+esc(t('liveData'))+'</span> '+demoBadge()+'</div></div>' +
        '<div class="flow">' + steps.map((s,i) =>
          '<div class="flow-node"><span style="color:var(--accent)">'+ICON[s[3]]+'</span>' +
          '<div style="flex:1"><b>'+esc(s[0])+'</b><br><small>'+esc(s[1])+'</small></div>' +
          '<span class="chip" style="'+(s[2]==='live'
            ? 'color:var(--good);border-color:var(--good)'
            : 'color:var(--fg-2);border-color:var(--line-soft)')+'">'+esc(s[2]==='live'?t('liveData'):t('demoData'))+'</span></div>' +
          (i < steps.length-1 ? '<div class="flow-arrow"></div>' : '')).join('') +
        '</div>' +
        '<div class="banner" style="margin-top:14px">'+ICON.info+'<div>Live environmental and weather data is fetched server-side via the WAQI API when API mode is active. See Settings to check live API health.</div></div>' +
      '</div>' +

      '<div style="display:flex;flex-direction:column;gap:14px">' +
        '<div class="card"><div class="card-head"><h2>'+esc(t('federated'))+'</h2></div>' +
          '<div id="fedSvg"></div>' +
          '<div class="divider"></div>' +
          '<div class="stat-row"><span>'+esc(t('fedActive').split(':')[0])+'</span>'+chip('Active','var(--good)')+'</div>' +
          '<div class="stat-row"><span>'+esc(t('citiesConnected'))+'</span><b>'+CITY_KEYS.length+'</b></div>' +
          '<div class="stat-row"><span>'+esc(t('modelsSynced'))+'</span><b id="syncCount">'+SYNCED+'</b></div>' +
          '<button class="btn btn-primary" id="syncBtn" style="width:100%;justify-content:center;margin-top:12px">'+ICON.network+esc(t('syncNow'))+'</button>' +
          '<p class="tiny muted" style="margin-top:10px">Each city trains on its own data. Only model weights are exchanged — no raw citizen report or sensor record leaves the city node. In this prototype the exchange is simulated.</p>' +
        '</div>' +
      '</div>' +
    '</div>';

  function fedGraph(){
    const w = 340, h = 230;
    const nodes = CITY_KEYS.map((k,i) => {
      const a = (i/CITY_KEYS.length)*Math.PI*2 - Math.PI/2;
      return {k, x: w/2 + Math.cos(a)*118, y: 86 + Math.sin(a)*66};
    });
    return '<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;height:auto">' +
      nodes.map(n => '<line class="sync-line" x1="'+n.x.toFixed(1)+'" y1="'+n.y.toFixed(1)+'" x2="'+(w/2)+'" y2="196"/>').join('') +
      nodes.map(n => '<g><circle cx="'+n.x.toFixed(1)+'" cy="'+n.y.toFixed(1)+'" r="15" fill="'+cssv('--accent-soft')+'" stroke="'+cssv('--accent')+'"/>' +
        '<text x="'+n.x.toFixed(1)+'" y="'+(n.y+4).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="600" fill="'+cssv('--accent')+'" font-family="IBM Plex Sans">'+CITY_DEFS[n.k].name.slice(0,2).toUpperCase()+'</text>' +
        '<text x="'+n.x.toFixed(1)+'" y="'+(n.y+29).toFixed(1)+'" text-anchor="middle" font-size="9.5" fill="'+cssv('--fg-3')+'" font-family="IBM Plex Sans">local model</text></g>').join('') +
      '<rect x="'+(w/2-78)+'" y="180" width="156" height="34" rx="10" fill="'+cssv('--panel-2')+'" stroke="'+cssv('--line-soft')+'"/>' +
      '<text x="'+(w/2)+'" y="201" text-anchor="middle" font-size="11" font-weight="600" fill="'+cssv('--fg')+'" font-family="IBM Plex Sans">Shared predictive model</text>' +
      '</svg>';
  }
  $('#fedSvg').innerHTML = fedGraph();
  $('#syncBtn').onclick = async () => {
    const b = $('#syncBtn');
    b.disabled = true; b.innerHTML = '<span class="spin"></span> ' + esc(t('syncing'));
    for (let i=1;i<=CITY_KEYS.length;i++){ $('#syncCount').textContent = i; await sleep(220); }
    SYNCED = CITY_KEYS.length;
    b.disabled = false; b.innerHTML = ICON.check + esc(t('syncDone'));
    toast(t('syncDone'), 'ok', ICON.network);
  };
};

