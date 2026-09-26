/* ============================================================
   Page: Live pollution map
   ============================================================ */
ROUTES.map = function(v){
  const d = city();
  v.innerHTML =
    pageHead(t('mapTitle'), tf('mapSub', {city: cityName(S.city)}),
      '<button class="btn" id="mapRefresh">'+ICON.reset+esc(t('refresh'))+'</button>') +
    '<div class="split">' +
      '<div id="mapHost"></div>' +
      '<div style="display:flex;flex-direction:column;gap:14px">' +
        '<div class="card"><div class="card-head"><h2>'+esc(t('layers'))+'</h2>'+demoBadge()+'</div><div id="layerHost"></div></div>' +
        '<div class="card"><div class="card-head"><h2>'+esc(t('weatherNow'))+'</h2></div>' +
          '<div class="stat-row"><span>'+esc(t('temp'))+'</span><b>'+d.weather.temp+'°C</b></div>' +
          '<div class="stat-row"><span>'+esc(t('humidity'))+'</span><b>'+d.weather.hum+'%</b></div>' +
          '<div class="stat-row"><span>'+esc(t('wind'))+'</span><b>'+d.weather.wind+' km/h</b></div>' +
          '<div class="stat-row"><span>'+esc(t('windDir'))+'</span><b>'+d.weather.dir+'</b></div>' +
          '<div class="stat-row"><span>'+esc(t('visibility'))+'</span><b>'+d.weather.vis+' km</b></div>' +
        '</div>' +
        '<div class="card"><div class="card-head"><h2>'+esc(t('lSensors'))+'</h2>' +
          '<span class="tiny muted">'+d.sensors.filter(s=>s.online).length+'/'+d.sensors.length+'</span></div>' +
          '<div style="max-height:250px;overflow:auto">' +
          d.sensors.slice().sort((a,b)=>b.aqi-a.aqi).map(s =>
            '<div class="stat-row" data-sid="'+esc(s.id)+'" style="cursor:pointer">' +
            '<span style="flex:1"><b style="color:var(--fg);font-weight:500">'+esc(s.name)+'</b><br><span class="tiny mono">'+esc(s.id)+'</span></span>' +
            '<b style="color:'+aqiColor(s.aqi)+'">'+(s.online? s.aqi : '—')+'</b></div>').join('') +
          '</div></div>' +
      '</div>' +
    '</div>';

  const host = $('#mapHost');
  let api = renderMap(host, d);
  $('#layerHost').appendChild(layerPanel(() => api.applyLayers()));
  $('#mapRefresh').onclick = () => doRefresh(false);
  $$('[data-sid]', v).forEach(n => n.onclick = () => {
    const s = d.sensors.find(x => x.id === n.dataset.sid);
    modal({
      title: esc(s.name), sub: esc(s.id) + ' · ' + esc(t('lastUpdated')) + ' ' + ago(s.ts),
      body:'<div class="aqi-hero">'+dial(s.aqi)+'<div>'+pollutantGrid(s) +
        '<div class="divider"></div>' +
        '<div class="stat-row"><span>'+esc(t('riskLevel'))+'</span>'+chip(s.risk, riskColor(s.risk))+'</div>' +
        '<div class="stat-row"><span>'+esc(t('temp'))+'</span><b>'+s.temp+'°C</b></div>' +
        '<div class="stat-row"><span>'+esc(t('humidity'))+'</span><b>'+s.hum+'%</b></div>' +
        '<div class="stat-row"><span>'+esc(t('wind'))+'</span><b>'+s.wind+' km/h '+s.dir+'</b></div>' +
        '<div class="stat-row"><span>Status</span><b>'+(s.online?'Reporting':'Offline')+'</b></div></div></div>',
      foot:'<button class="btn" data-close>'+esc(t('close'))+'</button>'
    });
  });
};

