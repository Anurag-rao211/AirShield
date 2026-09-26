/* ============================================================
   Page: AI hotspot detection
   ============================================================ */
let HOT_RUN = {};
ROUTES.hotspots = function(v){
  const d = city();
  const done = HOT_RUN[S.city];
  v.innerHTML =
    pageHead(t('hotTitle'), t('hotSub'),
      '<button class="btn btn-primary" id="runAi">'+ICON.ai+esc(t('runDetection'))+'</button>') +
    '<div class="banner" style="margin-bottom:14px">'+ICON.info+'<div><b>'+esc(t('simulated'))+'.</b> ' +
      'The engine below scores demo signals only: '+d.reports.length+' citizen reports, '+d.sensors.length+' sensors and current meteorological conditions for '+esc(cityName(S.city))+'.</div></div>' +
    '<div id="hotHost"></div>';

  const host = $('#hotHost');
  function idle(){
    host.innerHTML = '<div class="card"><div class="loader">' +
      '<div style="color:var(--accent)">'+ICON.target+'</div>' +
      '<div style="max-width:42ch">'+esc(tf('hotIdle', {city: cityName(S.city)}))+'</div>' +
      '<button class="btn btn-primary" id="runAi2">'+ICON.ai+esc(t('runDetection'))+'</button></div></div>';
    $('#runAi2').onclick = run;
  }
  function results(){
    host.innerHTML =
      '<div class="grid g-3" style="margin-bottom:14px">' +
      d.hotspots.map(h =>
        '<div class="card" data-hid="'+esc(h.id)+'" style="cursor:pointer">' +
        '<div class="card-head" style="margin-bottom:8px"><div class="mono tiny muted">Hotspot #'+pad(h.idx)+'</div>'+chip(h.risk, riskColor(h.risk))+'</div>' +
        '<h3>'+esc(h.name)+'</h3>' +
        '<div class="tiny muted" style="margin:4px 0 10px">'+esc(t('likelySource'))+': '+esc(h.source)+'</div>' +
        '<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:8px">' +
          '<span style="font-size:1.7rem;font-weight:700;color:'+aqiColor(h.aqi)+'">'+h.aqi+'</span>' +
          '<span class="tiny muted">AQI · PM2.5 '+h.pm25+'</span></div>' +
        '<div class="tiny muted" style="display:flex;justify-content:space-between"><span>'+esc(t('confidence'))+'</span><b style="color:var(--fg)">'+h.confidence+'%</b></div>' +
        '<div class="bar-track" style="margin-top:5px"><i class="bar-fill" style="display:block;width:'+h.confidence+'%;background:'+riskColor(h.risk)+'"></i></div>' +
        '<div class="divider"></div>' +
        '<div class="tiny">'+esc(t('recommended'))+'<br><span class="muted">'+esc(h.action)+'</span></div>' +
        '<div style="display:flex;gap:7px;margin-top:11px"><button class="btn btn-sm" data-view="'+esc(h.id)+'">'+esc(t('viewDetails'))+'</button>' +
        '<button class="btn btn-sm" data-alert="'+esc(h.id)+'">'+ICON.send+esc(t('sendAlert'))+'</button></div></div>').join('') +
      '</div>' +
      '<div class="card"><div class="card-head"><h2>'+esc(t('lHotspots'))+'</h2>'+demoBadge()+'</div><div id="hotMap"></div></div>';
    $$('[data-view]', host).forEach(b => b.onclick = e => { e.stopPropagation(); openHotspot(d.hotspots.find(h => h.id === b.dataset.view)); });
    $$('[data-alert]', host).forEach(b => b.onclick = e => {
      e.stopPropagation();
      const h = d.hotspots.find(x => x.id === b.dataset.alert);
      openAlertForm({ title:'AQI spike in ' + h.name, location:h.name, risk:h.risk, aqi:h.aqi, source:h.source, action:h.action });
    });
    $$('[data-hid]', host).forEach(c => c.onclick = () => openHotspot(d.hotspots.find(h => h.id === c.dataset.hid)));
    const saved = Object.assign({}, MAPST.layers);
    MAPST.layers.sensors = false; MAPST.layers.reports = false;
    const api = renderMap($('#hotMap'), d, {height:'380px'});
    MAPST.layers = saved;
  }
  async function run(){
    host.innerHTML = '<div class="card"><div class="loader">' +
      '<div class="pulse-ring"></div><div style="font-weight:600">'+esc(t('analyzing'))+'</div>' +
      '<div class="tiny muted" id="aiStep">Reading sensor grid...</div>' +
      '<div class="bars"><i></i><i></i><i></i><i></i><i></i></div></div></div>';
    const steps = ['Reading sensor grid...', 'Clustering citizen reports...', 'Overlaying satellite-style aerosol signal...', 'Applying wind dispersion model...', 'Scoring candidate hotspots...'];
    for (let i=0;i<steps.length;i++){
      const n = $('#aiStep'); if (n) n.textContent = steps[i];
      await sleep(280 + Math.random()*180);
    }
    HOT_RUN[S.city] = true;
    results();
    toast(d.hotspots.length + ' hotspots scored for ' + cityName(S.city), 'ok', ICON.ai);
    pushNotif('New critical hotspot detected', d.hotspots[0].name + ' — ' + d.hotspots[0].source, '--vpoor', 'ai');
  }
  $('#runAi').onclick = run;
  if (done) results(); else idle();
};

function openHotspot(h){
  if (!h) return;
  const d = city();
  modal({
    wide:true, title: esc(h.name), sub:'<span class="mono">'+esc(h.id)+'</span> · '+esc(t('simulated')),
    body:
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">'+chip(h.risk, riskColor(h.risk)) +
        chip(h.confidence + '% ' + t('confidence'), 'var(--accent)') + chip(h.source, 'var(--poor)') + '</div>' +
      '<div class="aqi-hero">'+dial(h.aqi)+'<div>'+pollutantGrid(h)+'</div></div>' +
      '<div class="divider"></div>' +
      '<div class="grid g-2">' +
        '<div><div class="stat-row"><span>'+esc(t('windDir'))+'</span><b>'+h.dir+' · '+h.wind+' km/h</b></div>' +
        '<div class="stat-row"><span>'+esc(t('temp'))+'</span><b>'+h.temp+'°C</b></div>' +
        '<div class="stat-row"><span>'+esc(t('humidity'))+'</span><b>'+h.hum+'%</b></div></div>' +
        '<div><div class="stat-row"><span>'+esc(t('population'))+'</span><b>'+h.people.toLocaleString('en-IN')+'</b></div>' +
        '<div class="stat-row"><span>'+esc(t('nearbyInfra'))+'</span><b style="text-align:right">'+esc(h.infra)+'</b></div>' +
        '<div class="stat-row"><span>'+esc(t('lastUpdated'))+'</span><b>'+ago(h.ts)+'</b></div></div>' +
      '</div>' +
      '<div class="banner warn" style="margin-top:14px">'+ICON.alerts+'<div><b>'+esc(t('recommended'))+'</b><br>'+esc(h.action)+'</div></div>',
    foot:'<button class="btn" data-close>'+esc(t('close'))+'</button>' +
      '<button class="btn" id="hsMap">'+ICON.map+esc(t('navMap'))+'</button>' +
      '<button class="btn btn-primary" id="hsAlert">'+ICON.send+esc(t('sendAlert'))+'</button>'
  });
  $('#hsMap').onclick = () => { closeModal(); go('map'); };
  $('#hsAlert').onclick = () => { closeModal(); openAlertForm({ title:'AQI spike in ' + h.name, location:h.name, risk:h.risk, aqi:h.aqi, source:h.source, action:h.action }); };
}

