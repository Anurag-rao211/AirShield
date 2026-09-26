/* ============================================================
   AirShield AI — rule-based, no external model
   ============================================================ */
const AI_LOG = [];
function aiAnswer(qRaw){
  const q = qRaw.toLowerCase(), d = city();
  const has = (...ws) => ws.some(w => q.includes(w));
  if (has('hotspot','हॉटस्पॉट')){
    const top = d.hotspots.slice(0,3).map(h => h.id + ' ' + h.name + ' — ' + h.source + ' (AQI ' + h.aqi + ', ' + h.confidence + '% confidence)').join('\n');
    return d.hotspots.length + ' hotspots are active in ' + cityName(S.city) + ' right now.\n\n' + top + '\n\nOpen AI hotspot detection for the full list and recommended responses.';
  }
  if (has('forecast','predict','पूर्वानुमान','tomorrow')){
    const fc = forecastSeries(d, FC_SALT[S.city]);
    const peak = fc.reduce((a,b) => b.aqi > a.aqi ? b : a);
    return 'The 24-hour model expects AQI to peak at ' + peak.aqi + ' (' + aqiCat(peak.aqi) + ') around ' + peak.clock + '. It is ' + d.aqi + ' now. Wind near the peak is about ' + peak.wind + ' km/h, which limits dispersion.';
  }
  if (has('why','high','कारण','खराब')){
    const h = d.hotspots[0];
    return 'AQI in ' + cityName(S.city) + ' is ' + d.aqi + ' (' + aqiCat(d.aqi) + '). The largest contribution in this dataset comes from ' + (h ? h.source.toLowerCase() : 'mixed sources') +
      ', with PM2.5 at ' + d.pm25 + ' µg/m³ and PM10 at ' + d.pm10 + '. Wind is ' + d.weather.wind + ' km/h from ' + d.weather.dir + ' and humidity is ' + d.weather.hum + '%, so particulates are not clearing quickly.';
  }
  if (has('report','रिपोर्ट','complaint')){
    const today = d.reports.filter(r => Date.now() - r.ts < 86400000).length;
    const crit = d.reports.filter(r => r.severity === 'Critical').length;
    return today + ' citizen reports were filed in the last 24 hours, out of ' + d.reports.length + ' on file for ' + cityName(S.city) + '. ' + crit + ' are marked critical. The most recent is from ' + d.reports[0].location + '.';
  }
  if (has('attention','worst','priority','ध्यान','action')){
    const worst = d.sensors.slice().sort((a,b) => b.aqi - a.aqi).slice(0,3);
    return 'Areas needing attention first:\n' + worst.map((s,i) => (i+1) + '. ' + s.name + ' — AQI ' + s.aqi + ' (' + aqiCat(s.aqi) + ')').join('\n') +
      '\n\nRecommended: ' + (d.hotspots[0] ? d.hotspots[0].action : ACTIONS[0]);
  }
  if (has('alert','चेतावनी')){
    const list = allAlerts();
    return list.length + ' alerts are on file for ' + cityName(S.city) + ', ' + list.filter(a => a.status === 'Open').length + ' still open. Open Alerts & response to acknowledge or assign a team.';
  }
  if (has('sensor','सेंसर')){
    const on = d.sensors.filter(s => s.online).length;
    return on + ' of ' + d.sensors.length + ' sensors are reporting. The highest current reading is ' + Math.max(...d.sensors.map(s=>s.aqi)) + ' at ' + d.sensors.slice().sort((a,b)=>b.aqi-a.aqi)[0].name + '.';
  }
  if (has('mask','safe','health','बाहर','outside')){
    const a = d.aqi;
    return a > 300 ? 'At AQI ' + a + ', avoid outdoor exertion. Keep windows shut during peak hours and use an N95 mask outdoors.'
      : a > 200 ? 'At AQI ' + a + ', people with asthma or heart conditions should limit outdoor activity, especially in the evening.'
      : 'At AQI ' + a + ', outdoor activity is generally fine, though sensitive groups should watch for evening peaks.';
  }
  if (has('help','what can you','कैसे')){
    return 'Ask me things like: why is AQI high, show today\'s hotspots, what is the forecast, how many citizen reports were submitted, or which areas need attention.';
  }
  return 'I can answer from the ' + cityName(S.city) + ' demo dataset: current AQI (' + d.aqi + '), hotspots (' + d.hotspots.length + '), citizen reports (' + d.reports.length + '), the 24-hour forecast, sensor status and open alerts. Try one of the suggestions below.';
}
function openAi(){
  if ($('#aiPanel')){ closeAi(); return; }
  const p = el('div','ai-panel'); p.id = 'aiPanel';
  p.innerHTML =
    '<div class="drawer-head"><span style="color:var(--accent)">'+ICON.ai+'</span>' +
    '<div style="flex:1"><div style="font-weight:600">'+esc(t('aiTitle'))+'</div>' +
    '<div class="tiny muted">'+esc(t('aiNote'))+'</div></div>' +
    '<button class="icon-btn" id="aiClose" style="width:30px;height:30px">'+ICON.close+'</button></div>' +
    '<div class="ai-log" id="aiLog"></div>' +
    '<div class="ai-sug" id="aiSug"></div>' +
    '<div class="ai-input"><input type="text" id="aiIn" placeholder="'+esc(t('aiPh'))+'">' +
    '<button class="btn btn-primary" id="aiSend" aria-label="Send">'+ICON.send+'</button></div>';
  $('#overlayRoot').appendChild(p);
  const log = $('#aiLog', p);
  const add = (who, text) => {
    const b = el('div','bub '+who, esc(text).replace(/\n/g,'<br>'));
    log.appendChild(b); log.scrollTop = log.scrollHeight;
  };
  if (!AI_LOG.length) AI_LOG.push(['ai', tf('aiHello', {city: cityName(S.city)})]);
  AI_LOG.forEach(([w,x]) => add(w, x));
  const sugs = ['Why is AQI high?', "Show today's hotspots.", 'What is the forecast?', 'How many citizen reports were submitted?', 'What areas need attention?'];
  $('#aiSug', p).innerHTML = sugs.map((s,i) => '<button data-s="'+i+'">'+esc(s)+'</button>').join('');
  $$('#aiSug button', p).forEach(b => b.onclick = () => ask(sugs[+b.dataset.s]));
  async function ask(q){
    if (!q.trim()) return;
    add('me', q); AI_LOG.push(['me', q]);
    $('#aiIn', p).value = '';
    const think = el('div','bub ai', '<span class="spin"></span>');
    log.appendChild(think); log.scrollTop = log.scrollHeight;
    await sleep(520);
    think.remove();
    const a = aiAnswer(q);
    add('ai', a); AI_LOG.push(['ai', a]);
  }
  $('#aiSend', p).onclick = () => ask($('#aiIn', p).value);
  $('#aiIn', p).addEventListener('keydown', e => { if (e.key === 'Enter') ask(e.target.value); });
  $('#aiClose', p).onclick = closeAi;
  setTimeout(() => $('#aiIn', p).focus(), 60);
}
function closeAi(){ const p = $('#aiPanel'); if (p) p.remove(); }

