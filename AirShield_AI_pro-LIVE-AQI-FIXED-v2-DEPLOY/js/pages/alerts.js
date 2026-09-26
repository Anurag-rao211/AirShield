/* ============================================================
   Page: Alerts & response
   ============================================================ */
ROUTES.alerts = function(v){
  const list = allAlerts();
  const open = list.filter(a => a.status === 'Open');
  v.innerHTML =
    pageHead(t('alTitle'), tf('alSub', {city: cityName(S.city)}),
      '<button class="btn btn-primary" id="newAl">'+ICON.plus+esc(t('newAlert'))+'</button>') +
    '<div class="grid g-kpi" style="margin-bottom:14px">' +
      kpi(t('critical'), list.filter(a => a.priority === 'Critical' || a.risk === 'Critical').length, 'needing response', 'var(--vpoor)', 'alerts') +
      kpi('Open', open.length, 'not yet acknowledged', 'var(--poor)', 'bell') +
      kpi(t('acknowledged'), list.filter(a => a.status === 'Acknowledged').length, 'teams notified', 'var(--good)', 'check') +
      kpi(t('history'), list.length, 'total dispatched', 'var(--accent)', 'reports') +
    '</div>' +
    (list.length ? '<div style="display:flex;flex-direction:column;gap:10px">' + list.map(a => {
      const col = riskColor(a.risk || 'Medium');
      return '<div class="card" data-aid="'+esc(a.id)+'" style="border-left:3px solid '+col+'">' +
        '<div class="card-head" style="margin-bottom:6px">' +
          '<div><div class="tiny muted mono">'+esc(a.id)+' · '+fmtTime(a.ts)+'</div>' +
          '<h3 style="margin-top:3px">'+esc(a.title)+'</h3></div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap">'+chip(a.risk||'Medium', col) +
          chip(a.status === 'Acknowledged' ? t('acknowledged') : 'Open', a.status === 'Acknowledged' ? 'var(--good)' : 'var(--moderate)') +
          (a.to ? chip(a.to, 'var(--accent)') : '') + '</div></div>' +
        '<div class="tiny muted" style="margin-bottom:8px">'+esc(a.location)+' · AQI '+a.aqi+' · '+esc(a.source||'')+
          (a.team ? ' · <b style="color:var(--fg)">'+esc(tf('assigned',{team:a.team}))+'</b>' : '') + '</div>' +
        '<div class="small">'+esc(a.action)+'</div>' +
        '<div style="display:flex;gap:7px;margin-top:11px;flex-wrap:wrap">' +
          '<button class="btn btn-sm" data-v="'+esc(a.id)+'">'+ICON.eye+esc(t('viewDetails'))+'</button>' +
          '<button class="btn btn-sm" data-ack="'+esc(a.id)+'"'+(a.status==='Acknowledged'?' disabled':'')+'>'+ICON.check+esc(a.status==='Acknowledged'?t('acknowledged'):t('acknowledge'))+'</button>' +
          '<button class="btn btn-sm" data-team="'+esc(a.id)+'">'+ICON.people+esc(t('assignTeam'))+'</button>' +
          '<button class="btn btn-sm" data-send="'+esc(a.id)+'">'+ICON.send+esc(t('sendAlert'))+'</button>' +
        '</div></div>';
    }).join('') + '</div>' : '<div class="card"><div class="empty">'+esc(t('noAlerts'))+'</div></div>');

  const byId = id => list.find(a => a.id === id);
  $('#newAl').onclick = () => { const d = city(), h = d.hotspots[0];
    openAlertForm({ title:'Air quality advisory — ' + cityName(S.city), location:h?h.name:cityName(S.city), risk:h?h.risk:'Medium', aqi:d.aqi, source:h?h.source:'Mixed sources', action:h?h.action:ACTIONS[0] }); };
  $$('[data-ack]', v).forEach(b => b.onclick = e => {
    e.stopPropagation();
    S.acked[b.dataset.ack] = true; save();
    toast(t('acknowledged') + ' — ' + b.dataset.ack, 'ok', ICON.check);
    pushNotif('Response team acknowledged alert', b.dataset.ack + ' acknowledged in ' + cityName(S.city), '--good', 'check');
    rerender();
  });
  $$('[data-team]', v).forEach(b => b.onclick = e => {
    e.stopPropagation();
    const id = b.dataset.team;
    const m = modal({ title: esc(t('assignTeam')), sub: esc(id),
      body:'<label class="field"><span>'+esc(t('assignTeam'))+'</span><select id="teamSel">' +
        TEAMS.map(x => '<option>'+esc(x)+'</option>').join('') + '</select></label>' +
        '<label class="field"><span>Note</span><textarea id="teamNote" placeholder="Anything the team should know before leaving."></textarea></label>',
      foot:'<button class="btn" data-close>'+esc(t('cancel'))+'</button><button class="btn btn-primary" id="teamOk">'+esc(t('assignTeam'))+'</button>' });
    $('#teamOk', m).onclick = () => {
      const team = $('#teamSel', m).value;
      S.assigned[id] = team; save(); closeModal();
      toast(tf('assigned', {team}), 'ok', ICON.people);
      pushNotif('Team assigned', team + ' assigned to ' + id, '--accent', 'people');
      rerender();
    };
  });
  $$('[data-send]', v).forEach(b => b.onclick = e => {
    e.stopPropagation(); const a = byId(b.dataset.send);
    openAlertForm({ title:a.title, location:a.location, risk:a.risk, aqi:a.aqi, source:a.source, action:a.action });
  });
  $$('[data-v]', v).forEach(b => b.onclick = e => { e.stopPropagation(); openAlert(byId(b.dataset.v)); });
  $$('[data-aid]', v).forEach(c => c.onclick = () => openAlert(byId(c.dataset.aid)));
};

function openAlert(a){
  if (!a) return;
  modal({
    title: esc(a.title), sub:'<span class="mono">'+esc(a.id)+'</span> · '+fmtDateTime(a.ts),
    body:
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'+chip(a.risk||'Medium', riskColor(a.risk||'Medium')) +
        chip(a.priority || 'High', 'var(--poor)') + (a.to ? chip(a.to, 'var(--accent)') : '') + '</div>' +
      '<div class="stat-row"><span>'+esc(t('location'))+'</span><b>'+esc(a.location)+'</b></div>' +
      '<div class="stat-row"><span>AQI</span><b style="color:'+aqiColor(a.aqi)+'">'+a.aqi+' · '+esc(aqiCat(a.aqi))+'</b></div>' +
      '<div class="stat-row"><span>'+esc(t('likelySource'))+'</span><b>'+esc(a.source||'—')+'</b></div>' +
      '<div class="stat-row"><span>'+esc(t('colStatus'))+'</span><b>'+esc(a.status)+'</b></div>' +
      (a.team ? '<div class="stat-row"><span>'+esc(t('assignTeam'))+'</span><b>'+esc(a.team)+'</b></div>' : '') +
      '<div class="banner warn" style="margin-top:12px">'+ICON.alerts+'<div><b>'+esc(t('recommended'))+'</b><br>'+esc(a.action)+'</div></div>' +
      (a.message ? '<div class="banner" style="margin-top:10px">'+ICON.send+'<div>'+esc(a.message)+'</div></div>' : ''),
    foot:'<button class="btn" data-close>'+esc(t('close'))+'</button>' +
      '<button class="btn btn-primary" id="alSend">'+ICON.send+esc(t('sendAlert'))+'</button>'
  });
  $('#alSend').onclick = () => { closeModal(); openAlertForm(a); };
}

function openAlertForm(seed){
  const d = city();
  const auto = seed.action + ' Current AQI at ' + seed.location + ' is ' + seed.aqi + ' (' + aqiCat(seed.aqi) + '), likely source: ' + (seed.source||'mixed') + '.';
  const m = modal({
    title: esc(t('sendAlert')), sub: esc(seed.title),
    body:
      '<label class="field"><span>'+esc(t('recipient'))+'</span><select id="alTo">' +
        RECIPIENTS.map(x => '<option>'+esc(x)+'</option>').join('') + '</select></label>' +
      '<label class="field"><span>'+esc(t('priority'))+'</span><select id="alPri">' +
        ['Normal','High','Critical'].map(x => '<option'+(x===(seed.risk==='Critical'?'Critical':'High')?' selected':'')+'>'+x+'</option>').join('') + '</select></label>' +
      '<label class="field"><span>'+esc(t('message'))+'</span><textarea id="alMsg" style="min-height:110px">'+esc(auto)+'</textarea>' +
      '<div class="err" id="eMsg">'+esc(t('errFields'))+'</div></label>' +
      '<div class="banner">'+ICON.info+'<div>'+esc(t('simulated'))+'. Nothing leaves this browser.</div></div>',
    foot:'<button class="btn" data-close>'+esc(t('cancel'))+'</button>' +
      '<button class="btn btn-primary" id="alGo">'+ICON.send+esc(t('dispatch'))+'</button>'
  });
  $('#alGo', m).onclick = async () => {
    const msg = $('#alMsg', m).value.trim();
    if (msg.length < 8){ $('#alMsg', m).classList.add('invalid'); $('#eMsg', m).classList.add('show'); return; }
    const to = $('#alTo', m).value, pri = $('#alPri', m).value;
    const btn = $('#alGo', m);
    btn.disabled = true; btn.innerHTML = '<span class="spin"></span> ' + esc(t('generating'));
    await sleep(700);
    const rec = {
      id:'AL-' + S.city.slice(0,2).toUpperCase() + '-' + Date.now().toString().slice(-5),
      city:S.city, title:seed.title, location:seed.location, risk:seed.risk || 'Medium',
      aqi:seed.aqi, source:seed.source, action:seed.action, message:msg,
      to, priority:pri, ts:Date.now(), status:'Open'
    };
    S.alerts.unshift(rec); save();
    closeModal();
    toast(tf('alertSent', {to}), 'ok', ICON.send);
    pushNotif('Alert dispatched', rec.id + ' → ' + to + ' (' + pri + ')', pri === 'Critical' ? '--vpoor' : '--accent', 'send');
    if (S.page === 'alerts') rerender(); else buildNav();
  };
}

