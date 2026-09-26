/* ============================================================
   Page: Infrastructure risk
   ============================================================ */
let INF_CAT = '';
ROUTES.infra = function(v){
  const d = city();
  const rows = d.infra.filter(i => !INF_CAT || i.category === INF_CAT);
  const catLabel = k => S.lang === 'hi' ? (INFRA_TYPES.find(c => c.k === k)||{}).hi : k;
  v.innerHTML =
    pageHead(t('infraTitle'), tf('infraSub', {city: cityName(S.city)}), demoBadge()) +
    '<div class="toolbar">' +
      '<button class="pick'+(INF_CAT===''?' on':'')+'" data-cat="">'+esc(t('allType'))+'</button>' +
      INFRA_TYPES.map(c => '<button class="pick'+(INF_CAT===c.k?' on':'')+'" data-cat="'+c.k+'">'+esc(catLabel(c.k))+'</button>').join('') +
    '</div>' +
    (rows.length ? '<div class="grid g-3">' + rows.map(i =>
      '<div class="card" data-iid="'+esc(i.id)+'" style="cursor:pointer">' +
      '<div class="card-head" style="margin-bottom:6px"><span class="chip" style="color:var(--fg-2);border-color:var(--line-soft)">'+esc(catLabel(i.category))+'</span>'+chip(i.risk, riskColor(i.risk))+'</div>' +
      '<h3>'+esc(i.name)+'</h3><div class="tiny muted" style="margin:3px 0 10px">'+esc(i.location)+'</div>' +
      '<div class="stat-row" style="padding:5px 0"><span>'+esc(t('kpiAqi'))+'</span><b style="color:'+aqiColor(i.aqi)+'">'+i.aqi+'</b></div>' +
      '<div class="stat-row" style="padding:5px 0"><span>'+esc(t('exposure'))+'</span><b>'+i.exposure.toLocaleString('en-IN')+'</b></div>' +
      '<div class="tiny muted" style="display:flex;justify-content:space-between;margin-top:8px"><span>'+esc(t('vulnerability'))+'</span><b style="color:var(--fg)">'+i.vulnerability+'/100</b></div>' +
      '<div class="bar-track" style="margin-top:5px"><i class="bar-fill" style="display:block;width:'+i.vulnerability+'%;background:'+riskColor(i.risk)+'"></i></div>' +
      '</div>').join('') + '</div>'
    : '<div class="card"><div class="empty">No facilities in this category. Pick another filter.</div></div>');

  $$('[data-cat]', v).forEach(b => b.onclick = () => { INF_CAT = b.dataset.cat; rerender(); });
  $$('[data-iid]', v).forEach(c => c.onclick = () => {
    const i = d.infra.find(x => x.id === c.dataset.iid);
    modal({
      title: esc(i.name), sub:'<span class="mono">'+esc(i.id)+'</span> · '+esc(i.location),
      body:
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'+chip(i.risk, riskColor(i.risk))+chip(catLabel(i.category),'var(--accent)')+'</div>' +
        '<div class="stat-row"><span>'+esc(t('kpiAqi'))+'</span><b style="color:'+aqiColor(i.aqi)+'">'+i.aqi+' · '+esc(aqiCat(i.aqi))+'</b></div>' +
        '<div class="stat-row"><span>'+esc(t('exposure'))+'</span><b>'+i.exposure.toLocaleString('en-IN')+' people</b></div>' +
        '<div class="stat-row"><span>'+esc(t('vulnerability'))+'</span><b>'+i.vulnerability+'/100</b></div>' +
        '<div class="stat-row"><span>'+esc(t('lastUpdated'))+'</span><b>'+ago(i.ts)+'</b></div>' +
        '<div class="banner warn" style="margin-top:12px">'+ICON.alerts+'<div><b>'+esc(t('action'))+'</b><br>'+esc(i.action)+'</div></div>',
      foot:'<button class="btn" data-close>'+esc(t('close'))+'</button>' +
        '<button class="btn btn-primary" id="inAl">'+ICON.send+esc(t('sendAlert'))+'</button>'
    });
    $('#inAl').onclick = () => { closeModal(); openAlertForm({
      title:'Facility at risk — ' + i.name, location:i.location, risk:i.risk, aqi:i.aqi,
      source:'Ambient exposure', action:i.action }); };
  });
};

