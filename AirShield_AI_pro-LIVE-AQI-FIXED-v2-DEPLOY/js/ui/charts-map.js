/* ============================================================
   Charts
   ============================================================ */
function cssv(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888'; }
function chartBase(){
  const fg = cssv('--fg-2'), grid = cssv('--grid');
  return {
    responsive:true, maintainAspectRatio:false,
    interaction:{ mode:'index', intersect:false },
    plugins:{
      legend:{ labels:{ color:fg, boxWidth:10, boxHeight:10, usePointStyle:true, pointStyle:'rectRounded', font:{family:'IBM Plex Sans', size:11} } },
      tooltip:{
        backgroundColor: cssv('--panel'), titleColor: cssv('--fg'), bodyColor: cssv('--fg-2'),
        borderColor: cssv('--line-soft'), borderWidth:1, padding:10, cornerRadius:8, displayColors:true,
        titleFont:{family:'IBM Plex Sans'}, bodyFont:{family:'IBM Plex Sans'}
      }
    },
    scales:{
      x:{ grid:{ color:grid, drawBorder:false }, ticks:{ color:fg, font:{size:10.5, family:'IBM Plex Sans'}, maxRotation:0, autoSkipPadding:12 } },
      y:{ grid:{ color:grid, drawBorder:false }, ticks:{ color:fg, font:{size:10.5, family:'IBM Plex Sans'} }, beginAtZero:true }
    }
  };
}
function mkChart(id, cfg){
  const c = document.getElementById(id); if (!c || !window.Chart) return null;
  if (charts[id]){ try{ charts[id].destroy(); }catch(e){} }
  charts[id] = new Chart(c.getContext('2d'), cfg);
  return charts[id];
}
function gradFill(ctx, hex){
  const g = ctx.createLinearGradient(0,0,0,240);
  g.addColorStop(0, hex + '55'); g.addColorStop(1, hex + '05');
  return g;
}

/* ============================================================
   Map engine — schematic, tile-free, fully interactive
   ============================================================ */
const MAPST = { k:1, tx:0, ty:0, layers:{ heat:true, industry:true, sensors:true, reports:true, hotspots:true, weather:false } };
function closePop(){ const p = $('#mapPop'); if (p) p.remove(); }

function svgEl(tag, attrs){
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}
function renderMap(host, d, opts){
  opts = opts || {};
  host.innerHTML = '';
  const shell = el('div','map-shell');
  if (opts.height) shell.style.height = opts.height;
  const svg = svgEl('svg', {viewBox:'0 0 1000 640', preserveAspectRatio:'xMidYMid slice', class:'map-svg'});
  svg.innerHTML =
    '<defs>' +
      '<filter id="blurHeat" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="26"/></filter>' +
      '<marker id="arrowW" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">' +
        '<path d="M0,0 L6,3 L0,6 z" fill="'+cssv('--accent')+'"/></marker>' +
    '</defs>';
  const world = svgEl('g', {id:'world'});
  svg.appendChild(world);

  /* base plate */
  world.appendChild(svgEl('rect', {x:-400, y:-400, width:1800, height:1440, fill:cssv('--map-land')}));

  /* river */
  const rv = svgEl('path', {
    d:'M -60 120 C 220 190, 300 330, 520 380 S 860 470, 1060 420',
    stroke:cssv('--map-water'), 'stroke-width':34, fill:'none', 'stroke-linecap':'round', opacity:.9});
  world.appendChild(rv);
  const rvLabel = svgEl('text', {x:120, y:170, fill:cssv('--fg-3'), 'font-size':13, 'font-family':'IBM Plex Sans'});
  rvLabel.textContent = d.def.river;
  world.appendChild(rvLabel);

  /* heat layer */
  const gHeat = svgEl('g', {id:'L-heat', filter:'url(#blurHeat)', opacity:.55});
  d.sensors.forEach(s => gHeat.appendChild(svgEl('circle', {cx:s.x, cy:s.y, r: 60 + s.aqi/4, fill: aqiColor(s.aqi), opacity:.5})));
  world.appendChild(gHeat);

  /* roads */
  const gRoad = svgEl('g', {id:'L-roads'});
  d.roads.forEach(r => {
    const dstr = 'M ' + r.pts.map(p => p[0]+' '+p[1]).join(' L ');
    gRoad.appendChild(svgEl('path', {d:dstr, stroke:cssv('--map-road'), 'stroke-width':9, fill:'none', 'stroke-linecap':'round'}));
  });
  world.appendChild(gRoad);

  /* industrial zones */
  const gInd = svgEl('g', {id:'L-industry'});
  d.zones.forEach(z => {
    gInd.appendChild(svgEl('rect', {x:z.x, y:z.y, width:z.w, height:z.h, rx:10, fill:cssv('--map-ind'), stroke:cssv('--poor'), 'stroke-dasharray':'6 5', 'stroke-width':1.2}));
    const tx = svgEl('text', {x:z.x+9, y:z.y+19, fill:cssv('--poor'), 'font-size':11, 'font-family':'IBM Plex Sans'});
    tx.textContent = z.name; gInd.appendChild(tx);
  });
  world.appendChild(gInd);

  /* weather arrows */
  const gW = svgEl('g', {id:'L-weather', opacity:.85});
  const angOf = dir => ({N:-90,NE:-45,E:0,SE:45,S:90,SW:135,W:180,NW:-135})[dir] || 0;
  for (let i=0;i<6;i++) for (let j=0;j<4;j++){
    const x = 110 + i*160, y = 90 + j*150, a = angOf(d.weather.dir) + (i+j)%3*4;
    const ln = svgEl('line', {x1:x, y1:y, x2:x+42, y2:y, stroke:cssv('--accent'), 'stroke-width':1.6, 'marker-end':'url(#arrowW)', transform:'rotate('+a+' '+x+' '+y+')', opacity:.6});
    gW.appendChild(ln);
  }
  world.appendChild(gW);

  /* marker groups */
  const groups = {
    sensors: svgEl('g', {id:'L-sensors'}),
    reports: svgEl('g', {id:'L-reports'}),
    hotspots: svgEl('g', {id:'L-hotspots'})
  };

  d.sensors.forEach(s => groups.sensors.appendChild(marker(s, 'sensor')));
  d.reports.slice(0, 26).forEach(r => groups.reports.appendChild(marker(r, 'report')));
  d.hotspots.forEach(h => groups.hotspots.appendChild(marker(h, 'hotspot')));
  world.appendChild(groups.sensors); world.appendChild(groups.reports); world.appendChild(groups.hotspots);

  function marker(item, kind){
    const g = svgEl('g', {class:'mk', tabindex:'0', role:'button'});
    if (kind === 'sensor'){
      g.appendChild(svgEl('circle', {cx:item.x, cy:item.y, r:11, fill:aqiColor(item.aqi), stroke:cssv('--panel'), 'stroke-width':2.4, opacity: item.online ? 1 : .35}));
      const txt = svgEl('text', {x:item.x, y:item.y+3.6, 'text-anchor':'middle', 'font-size':9.5, 'font-weight':'600', fill:'#08151C', 'font-family':'IBM Plex Sans', 'pointer-events':'none'});
      txt.textContent = item.aqi; g.appendChild(txt);
    } else if (kind === 'report'){
      g.appendChild(svgEl('path', {d:'M '+item.x+' '+(item.y-13)+' l 9 16 h -18 z', fill:cssv('--accent'), stroke:cssv('--panel'), 'stroke-width':1.6, opacity:.95}));
    } else {
      g.appendChild(svgEl('circle', {cx:item.x, cy:item.y, r:22, fill:riskColor(item.risk), opacity:.16}));
      g.appendChild(svgEl('circle', {cx:item.x, cy:item.y, r:9, fill:'none', stroke:riskColor(item.risk), 'stroke-width':2.6}));
      const txt = svgEl('text', {x:item.x, y:item.y-27, 'text-anchor':'middle', 'font-size':10.5, 'font-weight':'600', fill:riskColor(item.risk), 'font-family':'IBM Plex Sans', 'pointer-events':'none'});
      txt.textContent = item.id; g.appendChild(txt);
    }
    const open = e => { e.stopPropagation(); showPop(shell, g, item, kind, d); };
    g.addEventListener('click', open);
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(e); });
    return g;
  }

  /* controls */
  const ctrl = el('div','map-ctrl');
  ctrl.innerHTML =
    '<button data-z="in" aria-label="Zoom in">'+ICON.plus+'</button>' +
    '<button data-z="out" aria-label="Zoom out"><svg width="17" height="17" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 12h14"/></svg></button>' +
    '<button data-z="reset" aria-label="Reset view">'+ICON.reset+'</button>';
  const legend = el('div','map-legend');
  legend.innerHTML = BANDS.map(b => '<span class="legend-i"><i class="swatch" style="background:var('+b.v+')"></i>'+esc(t(b.key))+'</span>').join('');

  shell.appendChild(svg); shell.appendChild(ctrl); shell.appendChild(legend);
  host.appendChild(shell);

  function apply(){ world.setAttribute('transform', 'translate('+MAPST.tx+' '+MAPST.ty+') scale('+MAPST.k+')'); closePop(); }
  function zoom(f, cx=500, cy=320){
    const nk = clamp(MAPST.k * f, 0.6, 4);
    MAPST.tx = cx - (cx - MAPST.tx) * (nk / MAPST.k);
    MAPST.ty = cy - (cy - MAPST.ty) * (nk / MAPST.k);
    MAPST.k = nk; apply();
  }
  $$('button', ctrl).forEach(b => b.onclick = () => {
    const z = b.dataset.z;
    if (z === 'in') zoom(1.3); else if (z === 'out') zoom(1/1.3);
    else { MAPST.k = 1; MAPST.tx = 0; MAPST.ty = 0; apply(); }
  });

  let drag = null;
  svg.addEventListener('pointerdown', e => {
    if (e.target.closest('.mk')) return;
    drag = {x:e.clientX, y:e.clientY, tx:MAPST.tx, ty:MAPST.ty};
    svg.classList.add('dragging'); svg.setPointerCapture(e.pointerId); closePop();
  });
  svg.addEventListener('pointermove', e => {
    if (!drag) return;
    const rect = svg.getBoundingClientRect(), sc = 1000 / rect.width;
    MAPST.tx = drag.tx + (e.clientX - drag.x) * sc;
    MAPST.ty = drag.ty + (e.clientY - drag.y) * sc;
    world.setAttribute('transform', 'translate('+MAPST.tx+' '+MAPST.ty+') scale('+MAPST.k+')');
  });
  const stop = e => { drag = null; svg.classList.remove('dragging'); };
  svg.addEventListener('pointerup', stop); svg.addEventListener('pointercancel', stop);
  svg.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.12 : 1/1.12); }, {passive:false});
  svg.addEventListener('click', e => { if (!e.target.closest('.mk')) closePop(); });

  applyLayers();
  apply();
  return { applyLayers };

  function applyLayers(){
    const map = {heat:'L-heat', industry:'L-industry', sensors:'L-sensors', reports:'L-reports', hotspots:'L-hotspots', weather:'L-weather'};
    for (const k in map){
      const g = svg.querySelector('#'+map[k]);
      if (g) g.style.display = MAPST.layers[k] ? '' : 'none';
    }
  }
}

function showPop(shell, node, item, kind, d){
  closePop();
  const p = el('div','map-pop'); p.id = 'mapPop';
  const head = kind === 'sensor' ? item.name : kind === 'report' ? item.location : item.name;
  const aqi = item.aqi || 0;
  const rows = kind === 'report'
    ? [[t('colType'), typeLabel(item.kind)], [t('colSeverity'), sevLabel(item.severity)], [t('colStatus'), stLabel(item.status)], [t('confidence'), item.confidence + '%']]
    : [[t('pm25'), (item.pm25||0)+' µg/m³'], [t('pm10'), (item.pm10||0)+' µg/m³'],
       [t('temp'), (item.temp||d.weather.temp)+'°C'], [t('humidity'), (item.hum||d.weather.hum)+'%']];
  p.innerHTML =
    '<button class="close" aria-label="'+esc(t('close'))+'">'+ICON.close+'</button>' +
    '<div class="tiny muted mono">'+esc(item.id)+'</div>' +
    '<div style="font-weight:600;margin:2px 0 8px;padding-right:18px">'+esc(head)+'</div>' +
    (kind !== 'report' ? '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px"><span style="font-size:1.6rem;font-weight:700;color:'+aqiColor(aqi)+'">'+aqi+'</span>' +
      '<span class="tiny" style="color:'+aqiColor(aqi)+';font-weight:600">'+esc(aqiCat(aqi))+'</span></div>' : '') +
    rows.map(r => '<div class="stat-row" style="padding:4px 0"><span>'+esc(r[0])+'</span><b>'+esc(r[1])+'</b></div>').join('') +
    '<div class="stat-row" style="padding:4px 0"><span>'+esc(t('riskLevel'))+'</span>' + chip(kind==='report'? sevLabel(item.severity) : item.risk, riskColor(kind==='report'? item.severity : item.risk)) + '</div>' +
    '<div class="tiny" style="color:var(--fg-3);margin-top:7px">'+esc(t('lastUpdated'))+': '+ago(item.ts)+'</div>';
  shell.appendChild(p);
  const nb = node.getBoundingClientRect(), sb = shell.getBoundingClientRect();
  let left = nb.left - sb.left + nb.width/2 - 118;
  let top = nb.top - sb.top - p.offsetHeight - 14;
  if (top < 8) top = nb.top - sb.top + nb.height + 10;
  p.style.left = clamp(left, 8, sb.width - 244) + 'px';
  p.style.top = clamp(top, 8, sb.height - 40) + 'px';
  $('.close', p).onclick = closePop;
}

function layerPanel(onChange){
  const defs = [['sensors','lSensors','--accent'],['reports','lReports','--accent'],['hotspots','lHotspots','--vpoor'],['industry','lIndustry','--poor'],['weather','lWeather','--ok'],['heat','lHeat','--moderate']];
  const wrap = el('div');
  wrap.innerHTML = defs.map(([k,label]) =>
    '<label class="layer-row"><span>'+esc(t(label))+'</span>' +
    '<span class="switch"><input type="checkbox" data-l="'+k+'"'+(MAPST.layers[k]?' checked':'')+'><span class="track"></span></span></label>').join('');
  $$('input', wrap).forEach(i => i.onchange = () => { MAPST.layers[i.dataset.l] = i.checked; onChange(); });
  return wrap;
}

