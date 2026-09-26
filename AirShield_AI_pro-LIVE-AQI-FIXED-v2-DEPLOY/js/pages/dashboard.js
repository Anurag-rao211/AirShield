/* ============================================================
   Page: Dashboard
   ============================================================ */
ROUTES.dashboard = function(v){
  const d = city();
  const todayReports = d.reports.filter(r => Date.now() - r.ts < 86400000).length;
  const online = d.sensors.filter(s => s.online).length;
  const pctOnline = Math.round(online / d.sensors.length * 100);
  const openAlerts = allAlerts().filter(a => a.status === 'Open').length;
  const last12 = d.history.slice(-12);
  const fc = forecastSeries(d);
  const peak = Math.max(...fc.map(p => p.aqi));
  const riskLabel = peak > 320 ? 'Critical' : peak > 240 ? 'High' : peak > 160 ? 'Medium' : 'Low';

  v.innerHTML =
    pageHead(t('dashTitle'), tf('dashSub', {city: cityName(S.city)}),
      '<button class="btn" id="dlSummary">'+ICON.download+esc(t('downloadReport'))+'</button>' +
      '<button class="btn btn-primary" id="refreshAqi">'+ICON.reset+esc(t('refresh'))+'</button>') +

    '<div class="grid g-kpi" style="margin-bottom:14px">' +
      kpi(t('kpiAqi'), d.aqi, esc(aqiCat(d.aqi)) + ' · ' + esc(tf('updated', {t: ago(d.ts)})), aqiColor(d.aqi), 'target', sparkline(last12, aqiColor(d.aqi))) +
      kpi(t('kpiHotspots'), d.hotspots.length, esc(d.hotspots.filter(h=>h.risk==='Critical').length + ' critical'), 'var(--vpoor)', 'ai') +
      kpi(t('kpiReports'), todayReports, esc(d.reports.length + ' total on file'), 'var(--accent)', 'reports') +
      kpi(t('kpiAlerts'), openAlerts, esc(allAlerts().length + ' in history'), 'var(--poor)', 'alerts') +
      kpi(t('kpiSensors'), pctOnline + '%', esc(online + ' / ' + d.sensors.length + ' reporting'), 'var(--good)', 'sensor') +
      kpi(t('kpiRisk'), esc(riskLabel), esc(t('next24')) + ' · ' + t('fcPeak') + ' ' + peak, riskColor(riskLabel), 'forecast') +
    '</div>' +

    '<div class="split" style="margin-bottom:14px">' +
      '<div class="card"><div class="card-head"><div><h2>'+esc(cityName(S.city))+'</h2>' +
        '<div class="tiny muted" id="aqiStamp">'+esc(tf('updated', {t: ago(d.ts)}))+'</div></div>'+demoBadge()+'</div>' +
        '<div class="aqi-hero">'+dial(d.aqi)+'<div>'+pollutantGrid(d) +
        '<div class="divider"></div>' +
        '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">' +
          ['temp|'+d.weather.temp+'°C','humidity|'+d.weather.hum+'%','wind|'+d.weather.wind+' km/h '+d.weather.dir,'visibility|'+d.weather.vis+' km']
            .map(s => { const [k,val] = s.split('|'); return '<div><div class="tiny muted">'+esc(t(k))+'</div><div style="font-weight:600">'+esc(val)+'</div></div>'; }).join('') +
        '</div></div></div></div>' +

      '<div class="card"><div class="card-head"><h2>'+esc(t('trend12'))+'</h2></div>' +
        '<div class="chart-box sm"><canvas id="cDash12"></canvas></div>' +
        '<div class="divider"></div><h3 style="margin-bottom:10px">'+esc(t('pollutantMix'))+'</h3>' +
        '<div class="chart-box sm"><canvas id="cDashMix"></canvas></div></div>' +
    '</div>' +

    '<div class="split">' +
      '<div class="card"><div class="card-head"><h2>'+esc(t('recentReports'))+'</h2>' +
        '<button class="btn btn-sm" id="toReports">'+esc(t('viewAll'))+'</button></div>' +
        d.reports.slice(0,5).map(r =>
          '<div class="stat-row" data-rid="'+esc(r.id)+'" style="cursor:pointer;align-items:center">' +
          '<span style="flex:1"><b style="color:var(--fg);font-weight:600">'+esc(r.location)+'</b><br>' +
          '<span class="tiny">'+esc(typeLabel(r.kind))+' · '+ago(r.ts)+'</span></span>' +
          chip(sevLabel(r.severity), riskColor(r.severity)) + '</div>').join('') +
      '</div>' +
      '<div class="card"><div class="card-head"><h2>'+esc(t('topHotspots'))+'</h2>' +
        '<button class="btn btn-sm" id="toHot">'+esc(t('viewAll'))+'</button></div>' +
        d.hotspots.slice(0,4).map(h =>
          '<div class="stat-row" data-hid="'+esc(h.id)+'" style="cursor:pointer;align-items:center">' +
          '<span style="flex:1"><b style="color:var(--fg);font-weight:600">'+esc(h.name)+'</b><br>' +
          '<span class="tiny">'+esc(h.source)+' · '+h.confidence+'% '+esc(t('confidence'))+'</span></span>' +
          '<span style="text-align:right"><b style="color:'+aqiColor(h.aqi)+'">'+h.aqi+'</b><br>'+chip(h.risk, riskColor(h.risk))+'</span></div>').join('') +
      '</div>' +
    '</div>';

  /* charts */
  const c1 = document.getElementById('cDash12');
  if (c1){
    const ctx = c1.getContext('2d'), col = cssv('--accent');
    mkChart('cDash12', {
      type:'line',
      data:{ labels: last12.map((_,i) => (i===11?'now':'-'+(11-i)+'h')),
        datasets:[{ label:'AQI', data:last12, borderColor:col, backgroundColor:gradFill(ctx,col), fill:true, tension:.35, pointRadius:0, borderWidth:2 }] },
      options: Object.assign(chartBase(), {plugins:{legend:{display:false}, tooltip:chartBase().plugins.tooltip}})
    });
  }
  mkChart('cDashMix', {
    type:'bar',
    data:{ labels:[t('pm25'),t('pm10'),t('no2'),t('so2'),t('co'),t('o3')],
      datasets:[{ label:'µg/m³', data:[d.pm25,d.pm10,d.no2,d.so2,d.co,d.o3],
        backgroundColor:[cssv('--vpoor'),cssv('--poor'),cssv('--moderate'),cssv('--ok'),cssv('--accent'),cssv('--good')], borderRadius:6, borderWidth:0 }] },
    options: Object.assign(chartBase(), {plugins:{legend:{display:false}, tooltip:chartBase().plugins.tooltip}})
  });

  $('#refreshAqi').onclick = () => doRefresh(false);
  $('#toReports').onclick = () => go('reports');
  $('#toHot').onclick = () => go('hotspots');
  $('#dlSummary').onclick = () => {
    const lines = [
      'AirShield situation summary (DEMO DATA — simulated)',
      'City: ' + CITY_DEFS[S.city].name,
      'Generated: ' + fmtDateTime(Date.now()),
      '',
      'AQI: ' + d.aqi + ' (' + aqiCat(d.aqi) + ')',
      'PM2.5 ' + d.pm25 + ' µg/m³ | PM10 ' + d.pm10 + ' | NO2 ' + d.no2 + ' | SO2 ' + d.so2 + ' | CO ' + d.co + ' | O3 ' + d.o3,
      'Sensors online: ' + online + '/' + d.sensors.length,
      'Active hotspots: ' + d.hotspots.length + ' | Open alerts: ' + openAlerts,
      'Citizen reports (24h): ' + todayReports,
      'Forecast risk: ' + riskLabel + ' — predicted peak ' + peak,
      '',
      'Hotspots:',
      ...d.hotspots.map(h => '  ' + h.id + '  ' + h.name + ' — ' + h.source + ' — AQI ' + h.aqi + ' — ' + h.risk + ' — ' + h.confidence + '% confidence'),
      '',
      'This file contains simulated data generated for a prototype demonstration.'
    ];
    download('airshield-' + S.city + '-' + fmtDate(Date.now()) + '.txt', lines.join('\n'));
  };
  $$('[data-rid]', v).forEach(n => n.onclick = () => openReport(d.reports.find(r => r.id === n.dataset.rid)));
  $$('[data-hid]', v).forEach(n => n.onclick = () => openHotspot(d.hotspots.find(h => h.id === n.dataset.hid)));
};

