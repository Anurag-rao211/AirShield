/* ============================================================
   Page: AQI forecast
   ============================================================ */
function forecastSeries(d, salt){
  const r = rngFrom('fc-' + d.key + '-' + (salt || 'base'));
  const out = [];
  const peakHour = 12 + Math.floor(r()*6);
  for (let h = 0; h <= 24; h += 3){
    const curve = Math.exp(-Math.pow((h - peakHour)/7, 2));
    const aqi = clamp(Math.round(d.aqi + curve * between(r, 34, 78) + between(r, -16, 16)), 30, 480);
    const when = new Date(Date.now() + h*3600000);
    out.push({
      h, label: h === 0 ? 'now' : '+' + h + 'h', clock: pad(when.getHours()) + ':00',
      aqi, pm25: Math.round(aqi*0.42), pm10: Math.round(aqi*0.78),
      temp: d.weather.temp + Math.round(Math.sin(h/4)*4), hum: clamp(d.weather.hum + Math.round(Math.cos(h/5)*9), 15, 96),
      wind: +clamp(d.weather.wind + between(r,-3,4,1), 1, 30).toFixed(1)
    });
  }
  return out;
}
let FC_SALT = {};
ROUTES.forecast = function(v){
  const d = city();
  const fc = forecastSeries(d, FC_SALT[S.city]);
  const peak = fc.reduce((a,b) => b.aqi > a.aqi ? b : a);
  const spike = peak.aqi - d.aqi > 30;
  const from = fc[Math.max(0, fc.indexOf(peak)-1)].clock, to = fc[Math.min(fc.length-1, fc.indexOf(peak)+1)].clock;

  v.innerHTML =
    pageHead(t('fcTitle'), t('fcSub'),
      '<button class="btn" id="fcCsv">'+ICON.download+esc(t('downloadReport'))+'</button>' +
      '<button class="btn btn-primary" id="genFc">'+ICON.forecast+esc(t('generate'))+'</button>') +
    '<div class="banner ' + (spike ? 'warn' : '') + '" style="margin-bottom:14px" id="fcMsg">' + (spike ? ICON.alerts : ICON.check) +
      '<div>' + (spike ? esc(tf('fcMsg', {a:from, b:to})) : esc(t('fcCalm'))) +
      ' <span class="muted">' + esc(t('fcPeak')) + ': ' + peak.aqi + ' (' + esc(aqiCat(peak.aqi)) + ') ' + peak.clock + '</span></div></div>' +
    '<div class="grid g-kpi" style="margin-bottom:14px">' +
      kpi(t('kpiAqi'), d.aqi, esc(aqiCat(d.aqi)), aqiColor(d.aqi), 'target') +
      kpi(t('fcPeak'), peak.aqi, peak.clock + ' · ' + esc(aqiCat(peak.aqi)), aqiColor(peak.aqi), 'forecast') +
      kpi(t('temp'), fc[4].temp + '°C', esc(t('next24')), 'var(--fg)', 'sun') +
      kpi(t('wind'), fc[4].wind + ' km/h', d.weather.dir, 'var(--accent)', 'wind') +
      kpi(t('humidity'), fc[4].hum + '%', esc(t('next24')), 'var(--fg)', 'info') +
    '</div>' +
    '<div class="card" id="fcCard"><div class="card-head"><h2>'+esc(t('fcTitle'))+'</h2>'+demoBadge()+'</div>' +
      '<div class="chart-box"><canvas id="cFc"></canvas></div>' +
      '<div class="divider"></div>' +
      '<div class="grid g-2"><div><h3 style="margin-bottom:8px">'+esc(t('pm25'))+' / '+esc(t('pm10'))+'</h3>' +
        '<div class="chart-box sm"><canvas id="cFcPm"></canvas></div></div>' +
        '<div><h3 style="margin-bottom:8px">'+esc(t('weatherCorr'))+'</h3>' +
        '<div class="chart-box sm"><canvas id="cFcW"></canvas></div></div></div>' +
      '<div class="divider"></div>' +
      '<div class="table-wrap"><table><thead><tr><th class="nosort">Hour</th><th class="nosort">AQI</th><th class="nosort">'+esc(t('pm25'))+'</th><th class="nosort">'+esc(t('pm10'))+'</th><th class="nosort">'+esc(t('temp'))+'</th><th class="nosort">'+esc(t('wind'))+'</th><th class="nosort">'+esc(t('humidity'))+'</th></tr></thead><tbody>' +
        fc.map(p => '<tr style="cursor:default"><td><b>'+p.label+'</b> <span class="tiny muted">'+p.clock+'</span></td>' +
          '<td style="color:'+aqiColor(p.aqi)+';font-weight:600">'+p.aqi+'</td><td>'+p.pm25+'</td><td>'+p.pm10+'</td>' +
          '<td>'+p.temp+'°C</td><td>'+p.wind+' km/h</td><td>'+p.hum+'%</td></tr>').join('') +
      '</tbody></table></div></div>';

  drawForecast(fc);
  $('#genFc').onclick = async () => {
    const card = $('#fcCard');
    const keep = card.innerHTML;
    card.innerHTML = '<div class="loader"><div class="pulse-ring"></div><div style="font-weight:600">'+esc(t('generating'))+'</div>' +
      '<div class="tiny muted">Blending sensor history with wind, humidity and temperature</div></div>';
    await sleep(1100);
    FC_SALT[S.city] = Date.now();
    rerender();
    toast(t('generate') + ' — ' + t('saved'), 'ok', ICON.forecast);
    pushNotif('Forecast indicates an AQI spike', cityName(S.city) + ' — refreshed 24 h prediction', '--poor', 'forecast');
  };
  $('#fcCsv').onclick = () => {
    const rows = [['hour','clock','aqi','pm25','pm10','temp_c','wind_kmh','humidity_pct']]
      .concat(fc.map(p => [p.label, p.clock, p.aqi, p.pm25, p.pm10, p.temp, p.wind, p.hum]));
    download('airshield-forecast-' + S.city + '.csv', toCsv(rows), 'text/csv');
  };
};
function drawForecast(fc){
  const c = document.getElementById('cFc'); if (!c) return;
  const ctx = c.getContext('2d'), col = cssv('--poor');
  mkChart('cFc', {
    type:'line',
    data:{ labels: fc.map(p => p.clock),
      datasets:[{ label:'AQI', data: fc.map(p => p.aqi), borderColor:col, backgroundColor:gradFill(ctx,col),
        fill:true, tension:.35, borderWidth:2.4,
        pointBackgroundColor: fc.map(p => cssv(band(p.aqi).v)), pointRadius:4, pointHoverRadius:6 }] },
    options: chartBase()
  });
  mkChart('cFcPm', {
    type:'line',
    data:{ labels: fc.map(p => p.clock), datasets:[
      { label:t('pm25'), data:fc.map(p=>p.pm25), borderColor:cssv('--vpoor'), tension:.35, pointRadius:0, borderWidth:2 },
      { label:t('pm10'), data:fc.map(p=>p.pm10), borderColor:cssv('--moderate'), tension:.35, pointRadius:0, borderWidth:2 }] },
    options: chartBase()
  });
  const base = chartBase();
  base.scales.y1 = { position:'right', grid:{display:false}, ticks:{color:cssv('--fg-2'), font:{size:10.5}} };
  mkChart('cFcW', {
    type:'line',
    data:{ labels: fc.map(p => p.clock), datasets:[
      { label:t('wind'), data:fc.map(p=>p.wind), borderColor:cssv('--accent'), tension:.35, pointRadius:0, borderWidth:2, yAxisID:'y' },
      { label:t('humidity'), data:fc.map(p=>p.hum), borderColor:cssv('--ok'), tension:.35, pointRadius:0, borderWidth:2, yAxisID:'y1' }] },
    options: base
  });
}

