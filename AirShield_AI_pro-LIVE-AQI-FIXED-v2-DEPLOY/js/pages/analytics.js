/* ============================================================
   Page: Climate analytics
   ============================================================ */
let AN_RANGE = 7;
ROUTES.analytics = function(v){
  const d = city();
  const hist = d.history.slice(-AN_RANGE);
  const labels = hist.map((_,i) => { const dt = new Date(Date.now() - (hist.length-1-i)*86400000); return pad(dt.getDate())+'/'+pad(dt.getMonth()+1); });
  const r = rngFrom('src-'+S.city);
  const srcRaw = [between(r,24,36), between(r,20,30), between(r,12,22), between(r,9,20), between(r,5,11)];
  const tot = srcRaw.reduce((a,b)=>a+b,0);
  const src = srcRaw.map(x => Math.round(x/tot*100));
  const srcLabels = [t('tIndustrial'), t('tVehicle'), t('tDust'), t('tAgri'), 'Other'];
  const worst = Math.max(...hist), best = Math.min(...hist);
  const avg = Math.round(hist.reduce((a,b)=>a+b,0)/hist.length);

  v.innerHTML =
    pageHead(t('anTitle'), t('anSub'),
      [7,14,30].map(n => '<button class="pick'+(AN_RANGE===n?' on':'')+'" data-range="'+n+'">'+esc(t('range'+n))+'</button>').join('')) +
    '<div class="grid g-kpi" style="margin-bottom:14px">' +
      kpi('Average AQI', avg, esc(aqiCat(avg)) + ' · ' + AN_RANGE + ' days', aqiColor(avg), 'analytics') +
      kpi('Worst day', worst, esc(aqiCat(worst)), aqiColor(worst), 'alerts') +
      kpi('Cleanest day', best, esc(aqiCat(best)), aqiColor(best), 'check') +
      kpi(t('kpiReports'), d.reports.length, 'on file for ' + esc(cityName(S.city)), 'var(--accent)', 'reports') +
    '</div>' +
    '<div class="card" style="margin-bottom:14px"><div class="card-head"><h2>'+esc(tf('trend7', {n:AN_RANGE}))+'</h2>'+demoBadge()+'</div>' +
      '<div class="chart-box"><canvas id="cTrend"></canvas></div></div>' +
    '<div class="split" style="margin-bottom:14px">' +
      '<div class="card"><div class="card-head"><h2>'+esc(t('breakdown'))+'</h2></div>' +
        '<div class="chart-box"><canvas id="cBreak"></canvas></div></div>' +
      '<div class="card"><div class="card-head"><h2>'+esc(t('sources'))+'</h2></div>' +
        '<div class="chart-box sm"><canvas id="cSrc"></canvas></div>' +
        '<div class="divider"></div>' +
        srcLabels.map((l,i) => '<div class="stat-row"><span>'+esc(l)+'</span><b>'+src[i]+'%</b></div>').join('') +
      '</div>' +
    '</div>' +
    '<div class="card"><div class="card-head"><h2>'+esc(t('weatherCorr'))+'</h2>' +
      '<span class="tiny muted">Each point is one simulated day</span></div>' +
      '<div class="chart-box"><canvas id="cCorr"></canvas></div>' +
      '<div class="tiny muted" style="margin-top:10px">In this dataset, higher wind speed tends to sit with lower AQI, while high humidity with low wind traps particulates near the surface.</div></div>';

  $$('[data-range]', v).forEach(b => b.onclick = () => { AN_RANGE = +b.dataset.range; rerender(); });

  const ctx = document.getElementById('cTrend').getContext('2d');
  mkChart('cTrend', {
    type:'bar',
    data:{ labels, datasets:[{ label:'AQI', data:hist, backgroundColor: hist.map(a => cssv(band(a).v)), borderRadius:5 }] },
    options: Object.assign(chartBase(), {plugins:{legend:{display:false}, tooltip:chartBase().plugins.tooltip}})
  });
  const bo = chartBase(); bo.scales = {};
  mkChart('cBreak', {
    type:'doughnut',
    data:{ labels:[t('pm25'),t('pm10'),t('no2'),t('so2'),t('co'),t('o3')],
      datasets:[{ data:[d.pm25,d.pm10,d.no2,d.so2,d.co*10,d.o3],
        backgroundColor:[cssv('--vpoor'),cssv('--poor'),cssv('--moderate'),cssv('--ok'),cssv('--accent'),cssv('--good')],
        borderColor:cssv('--panel'), borderWidth:3, cutout:'58%' }] },
    options: Object.assign(bo, {plugins:{legend:{position:'bottom', labels:{color:cssv('--fg-2'), usePointStyle:true, boxWidth:9, font:{size:11}}}, tooltip:chartBase().plugins.tooltip}})
  });
  const so = chartBase(); so.indexAxis = 'y'; so.scales.x.max = 100;
  mkChart('cSrc', {
    type:'bar',
    data:{ labels:srcLabels, datasets:[{ label:'%', data:src, backgroundColor:cssv('--accent'), borderRadius:5 }] },
    options: Object.assign(so, {plugins:{legend:{display:false}, tooltip:chartBase().plugins.tooltip}})
  });
  const rr = rngFrom('corr-'+S.city);
  const pts = d.history.slice(-30).map(a => ({ x:+clamp(d.weather.wind + (300-a)/26 + between(rr,-2,2,1), 1, 26).toFixed(1), y:a }));
  const co = chartBase();
  co.scales.x = { type:'linear', title:{display:true, text:t('wind')+' (km/h)', color:cssv('--fg-2'), font:{size:11}}, grid:{color:cssv('--grid')}, ticks:{color:cssv('--fg-2'), font:{size:10.5}} };
  co.scales.y.title = {display:true, text:'AQI', color:cssv('--fg-2'), font:{size:11}};
  mkChart('cCorr', {
    type:'scatter',
    data:{ datasets:[{ label:'AQI vs wind', data:pts, backgroundColor:cssv('--accent'), pointRadius:5 }] },
    options: Object.assign(co, {plugins:{legend:{display:false}, tooltip:chartBase().plugins.tooltip}})
  });
};

