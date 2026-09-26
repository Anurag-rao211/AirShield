/* ============================================================
   Page: City comparison
   ============================================================ */
let CMP = ['delhi','kanpur','mumbai'];
ROUTES.compare = function(v){
  const sel = CMP.filter(k => CITY_DEFS[k]);
  const data = sel.map(k => {
    const d = cityData(k), fc = forecastSeries(d);
    const peak = Math.max(...fc.map(p => p.aqi));
    return { k, name: cityName(k), aqi:d.aqi, pm25:d.pm25, pm10:d.pm10,
      hotspots:d.hotspots.length, reports:d.reports.length + ((S.reports[k]||[]).length),
      risk: peak > 320 ? 'Critical' : peak > 240 ? 'High' : peak > 160 ? 'Medium' : 'Low', peak };
  });
  v.innerHTML =
    pageHead(t('cmpTitle'), t('cmpSub'), demoBadge()) +
    '<div class="toolbar">' + CITY_KEYS.map(k =>
      '<button class="pick'+(sel.includes(k)?' on':'')+'" data-c="'+k+'">' +
      (sel.includes(k) ? ICON.check : ICON.plus) + esc(cityName(k)) + '</button>').join('') + '</div>' +
    (!sel.length ? '<div class="card"><div class="empty">'+esc(t('cmpPick'))+'</div></div>' :
      '<div class="card" style="margin-bottom:14px"><div class="table-wrap"><table><thead><tr>' +
        '<th class="nosort">City</th><th class="nosort">AQI</th><th class="nosort">'+esc(t('pm25'))+'</th><th class="nosort">'+esc(t('pm10'))+'</th>' +
        '<th class="nosort">'+esc(t('kpiHotspots'))+'</th><th class="nosort">'+esc(t('navReports'))+'</th><th class="nosort">'+esc(t('kpiRisk'))+'</th></tr></thead><tbody>' +
        data.map(c => '<tr data-open="'+c.k+'"><td><b>'+esc(c.name)+'</b></td>' +
          '<td><b style="color:'+aqiColor(c.aqi)+'">'+c.aqi+'</b> <span class="tiny muted">'+esc(aqiCat(c.aqi))+'</span></td>' +
          '<td>'+c.pm25+'</td><td>'+c.pm10+'</td><td>'+c.hotspots+'</td><td>'+c.reports+'</td>' +
          '<td>'+chip(c.risk, riskColor(c.risk))+'</td></tr>').join('') +
        '</tbody></table></div>' +
        '<div class="tiny muted" style="margin-top:10px">'+esc(t('demoNote'))+'</div></div>' +
      '<div class="split">' +
        '<div class="card"><div class="card-head"><h2>AQI, PM2.5 and PM10</h2></div><div class="chart-box"><canvas id="cCmp"></canvas></div></div>' +
        '<div class="card"><div class="card-head"><h2>Response load</h2></div><div class="chart-box"><canvas id="cCmp2"></canvas></div></div>' +
      '</div>');

  $$('[data-c]', v).forEach(b => b.onclick = () => {
    const k = b.dataset.c;
    CMP = CMP.includes(k) ? CMP.filter(x => x !== k) : CMP.concat(k);
    rerender();
  });
  $$('[data-open]', v).forEach(tr => tr.onclick = () => setCity(tr.dataset.open));
  if (!sel.length) return;
  mkChart('cCmp', {
    type:'bar',
    data:{ labels:data.map(c=>c.name), datasets:[
      { label:'AQI', data:data.map(c=>c.aqi), backgroundColor:cssv('--poor'), borderRadius:5 },
      { label:t('pm25'), data:data.map(c=>c.pm25), backgroundColor:cssv('--vpoor'), borderRadius:5 },
      { label:t('pm10'), data:data.map(c=>c.pm10), backgroundColor:cssv('--moderate'), borderRadius:5 }] },
    options: chartBase()
  });
  mkChart('cCmp2', {
    type:'bar',
    data:{ labels:data.map(c=>c.name), datasets:[
      { label:t('kpiHotspots'), data:data.map(c=>c.hotspots), backgroundColor:cssv('--accent'), borderRadius:5 },
      { label:t('navReports'), data:data.map(c=>c.reports), backgroundColor:cssv('--ok'), borderRadius:5 }] },
    options: chartBase()
  });
};

