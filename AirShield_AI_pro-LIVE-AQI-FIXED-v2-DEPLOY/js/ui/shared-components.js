/* ============================================================
   Shared page pieces
   ============================================================ */
function dial(aqi){
  const pct = clamp(aqi/500, 0, 1) * 100;
  const arc = 'M 54.95 185.05 A 92 92 0 1 1 185.05 185.05';
  const ticks = BANDS.map(b => {
    const p = clamp(b.max/500,0,1);
    const a = 135 + p*270, rad = a*Math.PI/180;
    const x1 = 120 + Math.cos(rad)*104, y1 = 120 + Math.sin(rad)*104;
    const x2 = 120 + Math.cos(rad)*110, y2 = 120 + Math.sin(rad)*110;
    return b.max > 450 ? '' : '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="var('+b.v+')" stroke-width="3" stroke-linecap="round" opacity=".75"/>';
  }).join('');
  return '<div class="dial"><svg viewBox="0 0 240 240" style="width:100%;height:auto;display:block">' +
    ticks +
    '<path d="'+arc+'" fill="none" stroke="var(--line-soft)" stroke-width="16" stroke-linecap="round"/>' +
    '<path d="'+arc+'" fill="none" stroke="'+aqiColor(aqi)+'" stroke-width="16" stroke-linecap="round" pathLength="100" stroke-dasharray="'+pct.toFixed(1)+' 100"/>' +
    '</svg><div class="dial-val"><div class="dial-num" style="color:'+aqiColor(aqi)+'">'+aqi+'</div>' +
    '<div class="dial-cat" style="color:'+aqiColor(aqi)+'">'+esc(aqiCat(aqi))+'</div>' +
    '<div class="dial-time">AQI · CPCB</div></div></div>';
}
function pollutantGrid(d){
  const items = [
    ['pm25', d.pm25, 'µg/m³'], ['pm10', d.pm10, 'µg/m³'], ['no2', d.no2, 'µg/m³'],
    ['so2', d.so2, 'µg/m³'], ['co', d.co, 'mg/m³'], ['o3', d.o3, 'µg/m³']
  ];
  return '<div class="pollutants">' + items.map(([k,v,u]) =>
    '<div class="poll"><span>'+esc(t(k))+'</span><b>'+v+'<span class="unit">'+u+'</span></b></div>').join('') + '</div>';
}
function sparkline(vals, color){
  const w = 96, h = 40, min = Math.min(...vals), max = Math.max(...vals) || 1;
  const pts = vals.map((v,i) => [i*(w/(vals.length-1)), h - 3 - ((v-min)/((max-min)||1))*(h-8)]);
  const dstr = 'M ' + pts.map(p => p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' L ');
  return '<svg class="spark" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><path d="'+dstr+'" fill="none" stroke="'+color+'" stroke-width="1.8"/></svg>';
}
function kpi(label, value, sub, color, iconName, spark){
  return '<div class="card kpi"><div class="label">'+ICON[iconName]+'<span>'+esc(label)+'</span></div>' +
    '<div class="value"'+(color?' style="color:'+color+'"':'')+'>'+value+'</div>' +
    '<div class="sub">'+sub+'</div>' + (spark || '') + '</div>';
}
function pageHead(title, sub, actionsHtml){
  return '<div class="page-head"><div><h1>'+esc(title)+'</h1><p>'+esc(sub)+'</p></div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">'+(actionsHtml||'')+'</div></div>';
}
function demoBadge(){
  const d = CACHE[S.city];
  if (d && d.live) return '<span class="chip tag-live" data-live-status title="'+esc(d.station?.name ? 'Station: '+d.station.name : 'Live WAQI data')+'">'+esc(t('liveData'))+' · WAQI</span>';
  if (S.dataMode === 'api' && d && !d.live) return '<span class="chip" data-live-status style="color:var(--vpoor);border-color:var(--vpoor)" title="'+esc(d.liveError||'Live API unavailable')+'">LIVE API ERROR</span>';
  return '<span class="chip" data-live-status style="color:var(--fg-2);border-color:var(--line-soft);background:var(--panel-2)">'+esc(t('demoData'))+'</span>';
}

