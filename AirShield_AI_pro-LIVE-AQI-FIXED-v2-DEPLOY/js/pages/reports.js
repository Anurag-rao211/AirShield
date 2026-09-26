/* ============================================================
   Page: Citizen reports
   ============================================================ */
const RF = { q:'', sev:'', type:'', status:'', sort:'date', dir:-1 };
ROUTES.reports = function(v){
  const d = city();
  v.innerHTML =
    pageHead(t('reportsTitle'), tf('reportsSub', {city: cityName(S.city)}),
      '<button class="btn" id="csv">'+ICON.download+esc(t('exportCsv'))+'</button>' +
      '<button class="btn btn-primary" id="newRep">'+ICON.plus+esc(t('newReport'))+'</button>') +
    '<div class="card">' +
      '<div class="toolbar">' +
        '<input type="text" id="fq" placeholder="'+esc(t('searchReports'))+'" value="'+esc(RF.q)+'" style="min-width:200px;flex:1">' +
        '<select id="fsev"><option value="">'+esc(t('allSeverity'))+'</option>' + SEVS.map(s => '<option value="'+s+'"'+(RF.sev===s?' selected':'')+'>'+esc(sevLabel(s))+'</option>').join('') + '</select>' +
        '<select id="ftype"><option value="">'+esc(t('allType'))+'</option>' + TYPES.map(s => '<option value="'+s+'"'+(RF.type===s?' selected':'')+'>'+esc(typeLabel(s))+'</option>').join('') + '</select>' +
        '<select id="fst"><option value="">'+esc(t('allStatus'))+'</option>' + STATS.map(s => '<option value="'+s+'"'+(RF.status===s?' selected':'')+'>'+esc(stLabel(s))+'</option>').join('') + '</select>' +
        '<button class="btn btn-sm" id="fclear">'+esc(t('clearFilters'))+'</button>' +
        '<span class="tiny muted" id="fcount" style="margin-left:auto"></span>' +
      '</div>' +
      '<div id="tableHost"></div>' +
    '</div>';

  function filtered(){
    let rows = d.reports.filter(r => {
      if (RF.sev && r.severity !== RF.sev) return false;
      if (RF.type && r.kind !== RF.type) return false;
      if (RF.status && r.status !== RF.status) return false;
      if (RF.q){
        const q = RF.q.toLowerCase();
        if (!(r.id.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) ||
              (r.desc||'').toLowerCase().includes(q) || typeLabel(r.kind).toLowerCase().includes(q))) return false;
      }
      return true;
    });
    const sevRank = {Low:0, Medium:1, High:2, Critical:3};
    rows.sort((a,b) => {
      let x, y;
      if (RF.sort === 'date'){ x = a.ts; y = b.ts; }
      else if (RF.sort === 'severity'){ x = sevRank[a.severity]; y = sevRank[b.severity]; }
      else if (RF.sort === 'confidence'){ x = a.confidence; y = b.confidence; }
      else { x = String(a[RF.sort] || '').toLowerCase(); y = String(b[RF.sort] || '').toLowerCase(); }
      return x < y ? -RF.dir : x > y ? RF.dir : 0;
    });
    return rows;
  }
  function paint(){
    const rows = filtered();
    $('#fcount').textContent = rows.length + ' / ' + d.reports.length;
    const host = $('#tableHost');
    if (!rows.length){
      host.innerHTML = '<div class="empty">'+esc(t('noReports'))+'</div>';
      return;
    }
    const arrow = k => RF.sort === k ? (RF.dir === 1 ? ' ↑' : ' ↓') : '';
    host.innerHTML = '<div class="table-wrap"><table><thead><tr>' +
      '<th data-s="id">'+esc(t('colId'))+arrow('id')+'</th>' +
      '<th data-s="location">'+esc(t('colLocation'))+arrow('location')+'</th>' +
      '<th data-s="kind">'+esc(t('colType'))+arrow('kind')+'</th>' +
      '<th data-s="severity">'+esc(t('colSeverity'))+arrow('severity')+'</th>' +
      '<th data-s="date">'+esc(t('colDate'))+arrow('date')+'</th>' +
      '<th data-s="status">'+esc(t('colStatus'))+arrow('status')+'</th>' +
      '<th data-s="confidence">'+esc(t('colConfidence'))+arrow('confidence')+'</th>' +
      '</tr></thead><tbody>' +
      rows.map(r => '<tr data-id="'+esc(r.id)+'">' +
        '<td class="mono">'+esc(r.id)+(r.mine?' <span class="chip" style="color:var(--accent);border-color:var(--accent)">you</span>':'')+'</td>' +
        '<td>'+esc(r.location)+'</td><td>'+esc(typeLabel(r.kind))+'</td>' +
        '<td>'+chip(sevLabel(r.severity), riskColor(r.severity))+'</td>' +
        '<td class="tiny">'+fmtDateTime(r.ts)+'</td>' +
        '<td>'+chip(stLabel(r.status), r.status==='Resolved'?'var(--good)':r.status==='New'?'var(--accent)':'var(--moderate)')+'</td>' +
        '<td><div style="display:flex;align-items:center;gap:8px"><div class="bar-track" style="width:56px"><i class="bar-fill" style="display:block;width:'+r.confidence+'%;background:var(--accent)"></i></div><span class="tiny">'+r.confidence+'%</span></div></td>' +
        '</tr>').join('') + '</tbody></table></div>';
    $$('th[data-s]', host).forEach(th => th.onclick = () => {
      const k = th.dataset.s;
      if (RF.sort === k) RF.dir *= -1; else { RF.sort = k; RF.dir = k === 'date' ? -1 : 1; }
      paint();
    });
    $$('tbody tr', host).forEach(tr => tr.onclick = () => openReport(rows.find(r => r.id === tr.dataset.id)));
  }
  paint();

  $('#fq').oninput = e => { RF.q = e.target.value; paint(); };
  $('#fsev').onchange = e => { RF.sev = e.target.value; paint(); };
  $('#ftype').onchange = e => { RF.type = e.target.value; paint(); };
  $('#fst').onchange = e => { RF.status = e.target.value; paint(); };
  $('#fclear').onclick = () => { RF.q=''; RF.sev=''; RF.type=''; RF.status=''; rerender(); };
  $('#newRep').onclick = openReportForm;
  $('#csv').onclick = () => {
    const rows = [[t('colId'),t('colLocation'),t('colType'),t('colSeverity'),t('colDate'),t('colStatus'),t('colConfidence')]]
      .concat(filtered().map(r => [r.id, r.location, typeLabel(r.kind), sevLabel(r.severity), fmtDateTime(r.ts), stLabel(r.status), r.confidence + '%']));
    download('airshield-reports-' + S.city + '.csv', toCsv(rows), 'text/csv');
  };
};

function openReport(r){
  if (!r) return;
  modal({
    title: esc(r.location), sub: '<span class="mono">'+esc(r.id)+'</span> · ' + fmtDateTime(r.ts),
    body:
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' +
        chip(sevLabel(r.severity), riskColor(r.severity)) +
        chip(stLabel(r.status), r.status==='Resolved'?'var(--good)':'var(--moderate)') +
        chip(typeLabel(r.kind), 'var(--accent)') + '</div>' +
      '<p>'+esc(r.desc || '')+'</p>' +
      (r.photo ? '<img src="'+r.photo+'" alt="Photo attached to the report" style="width:100%;border-radius:12px;margin:10px 0;max-height:280px;object-fit:cover">' : '') +
      '<div class="stat-row"><span>'+esc(t('confidence'))+'</span><b>'+r.confidence+'%</b></div>' +
      '<div class="stat-row"><span>Reported by</span><b>'+esc(r.reporter || 'Anonymous')+'</b></div>' +
      (r.sensorRef ? '<div class="stat-row"><span>Nearest sensor</span><b class="mono">'+esc(r.sensorRef)+'</b></div>' : '') +
      '<div class="stat-row"><span>'+esc(t('location'))+'</span><b>'+esc(r.location)+' · '+esc(cityName(S.city))+'</b></div>' +
      '<div class="banner" style="margin-top:12px">'+ICON.info+'<div>'+esc(t('simulated'))+'. '+esc(t('demoNote'))+'</div></div>',
    foot: '<button class="btn" data-close>'+esc(t('close'))+'</button>' +
      '<button class="btn" id="repMap">'+ICON.map+esc(t('navMap'))+'</button>' +
      '<button class="btn btn-primary" id="repAlert">'+ICON.send+esc(t('sendAlert'))+'</button>'
  });
  $('#repMap').onclick = () => { closeModal(); go('map'); };
  $('#repAlert').onclick = () => { closeModal(); openAlertForm({
    title:'Citizen report escalated — ' + r.location, location:r.location, risk:r.severity,
    aqi:city().aqi, source:typeLabel(r.kind),
    action:'Verify the reported ' + typeLabel(r.kind).toLowerCase() + ' at ' + r.location + ' and record findings against ' + r.id + '.'
  }); };
}

function openReportForm(){
  const d = city();
  const now = new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
  const m = modal({
    title: esc(t('newReport')), sub: esc(cityName(S.city)) + ' · ' + esc(t('demoData')),
    body:
      '<label class="field"><span>'+esc(t('formName'))+'</span><input type="text" id="rName" placeholder="Anonymous"></label>' +
      '<label class="field"><span>'+esc(t('formLocation'))+' <i class="req">*</i></span>' +
        '<input type="text" id="rLoc" list="areaList" placeholder="'+esc(d.sensors[0].name)+'">' +
        '<datalist id="areaList">'+d.def.areas.map(a => '<option value="'+esc(a)+'">').join('')+'</datalist>' +
        '<div class="err" id="eLoc">'+esc(t('errLocation'))+'</div></label>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        '<label class="field"><span>'+esc(t('formType'))+' <i class="req">*</i></span><select id="rType">' +
          '<option value="">—</option>' + TYPES.map(x => '<option value="'+x+'">'+esc(typeLabel(x))+'</option>').join('') + '</select>' +
          '<div class="err" id="eType">'+esc(t('errFields'))+'</div></label>' +
        '<label class="field"><span>'+esc(t('formSeverity'))+' <i class="req">*</i></span><select id="rSev">' +
          SEVS.map(x => '<option value="'+x+'"'+(x==='Medium'?' selected':'')+'>'+esc(sevLabel(x))+'</option>').join('') + '</select></label>' +
      '</div>' +
      '<label class="field"><span>'+esc(t('formDesc'))+' <i class="req">*</i></span>' +
        '<textarea id="rDesc" placeholder="Describe what you can see or smell, and for how long."></textarea>' +
        '<div class="err" id="eDesc">'+esc(t('errFields'))+'</div></label>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        '<label class="field"><span>'+esc(t('formWhen'))+'</span><input type="datetime-local" id="rWhen" value="'+now+'"></label>' +
        '<label class="field"><span>'+esc(t('formSensor'))+'</span><input type="number" id="rSensor" placeholder="PM2.5 µg/m³" min="0" max="999"></label>' +
      '</div>' +
      '<div class="field"><span>'+esc(t('formPhoto'))+'</span>' +
        '<div class="dropzone" id="rDrop">'+esc(t('photoHint'))+'</div>' +
        '<input type="file" id="rPhoto" accept="image/*" hidden>' +
        '<div id="rPrev"></div></div>',
    foot: '<button class="btn" data-close>'+esc(t('cancel'))+'</button>' +
      '<button class="btn btn-primary" id="rSubmit">'+ICON.send+esc(t('submitReport'))+'</button>'
  });

  let photo = '';
  $('#rDrop', m).onclick = () => $('#rPhoto', m).click();
  $('#rPhoto', m).onchange = e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    if (f.size > 3.5e6){ toast('That image is too large for browser storage. Pick one under 3 MB.', 'warn', ICON.info); return; }
    const fr = new FileReader();
    fr.onload = () => { photo = fr.result; $('#rPrev', m).innerHTML = '<img src="'+photo+'" alt="Preview" style="width:100%;max-height:180px;object-fit:cover;border-radius:12px;margin-top:8px">'; };
    fr.onerror = () => toast('That image could not be read. Try another file.', 'bad', ICON.info);
    fr.readAsDataURL(f);
  };

  $('#rSubmit', m).onclick = () => {
    const loc = $('#rLoc', m).value.trim(), type = $('#rType', m).value, desc = $('#rDesc', m).value.trim();
    let bad = false;
    const mark = (inputId, errId, isBad) => {
      $(inputId, m).classList.toggle('invalid', isBad);
      $(errId, m).classList.toggle('show', isBad);
      if (isBad) bad = true;
    };
    mark('#rLoc', '#eLoc', !loc);
    mark('#rType', '#eType', !type);
    mark('#rDesc', '#eDesc', desc.length < 4);
    if (bad){ toast(t('errFields'), 'bad', ICON.info); return; }

    const when = $('#rWhen', m).value ? new Date($('#rWhen', m).value).getTime() : Date.now();
    const sensorVal = $('#rSensor', m).value;
    const near = d.sensors.reduce((best, s) => s.name.toLowerCase() === loc.toLowerCase() ? s : best, d.sensors[0]);
    const rep = {
      id:'AS-2026-' + (10000 + Math.floor(Math.random()*89999)),
      city:S.city, kind:type, location:loc, severity:$('#rSev', m).value,
      status:'New', confidence: rnd(62, 95), desc, photo,
      reporter: $('#rName', m).value.trim() || 'Anonymous',
      ts: when, sensorRef: sensorVal ? 'manual · PM2.5 ' + sensorVal : near.id,
      x: near.x + rnd(-40,40), y: near.y + rnd(-30,30), mine:true, risk:$('#rSev', m).value
    };
    S.reports[S.city] = [rep].concat(S.reports[S.city] || []);
    try{ save(); }catch(e){}
    closeModal();
    if (S.page === 'reports') rerender();
    pushNotif('Citizen report received', loc + ' — ' + typeLabel(type), '--accent', 'reports');
    paintBell();
    modal({
      title: esc(t('reportOk').split('.')[0]) + '.',
      body:'<div style="text-align:center;padding:8px 0 4px">' +
        '<div style="width:56px;height:56px;border-radius:50%;background:color-mix(in srgb,var(--good) 18%,transparent);color:var(--good);display:grid;place-items:center;margin:0 auto 12px">'+ICON.check+'</div>' +
        '<p>'+esc(S.lang==='hi' ? 'आपकी रिपोर्ट दर्ज हो गई। संदर्भ संख्या:' : 'Your report is on the list. Reference number:')+'</p>' +
        '<div class="mono" style="font-size:1.15rem;font-weight:600;color:var(--accent)">'+esc(rep.id)+'</div>' +
        '<p class="tiny muted" style="margin-top:10px">Saved in this browser, so it stays on the list after a refresh.</p></div>',
      foot:'<button class="btn" data-close>'+esc(t('close'))+'</button><button class="btn btn-primary" id="seeIt">'+esc(t('viewDetails'))+'</button>'
    });
    $('#seeIt').onclick = () => { closeModal(); go('reports'); setTimeout(() => openReport(rep), 120); };
  };
}

