/* ============================================================
   Page: Settings
   ============================================================ */
ROUTES.settings = function(v){
  v.innerHTML =
    pageHead(t('setTitle'), t('setSub'), '') +
    '<div class="grid g-2">' +
      '<div class="card"><div class="card-head"><h2>'+esc(t('language'))+' & '+esc(t('theme'))+'</h2></div>' +
        '<label class="field"><span>'+esc(t('language'))+'</span><select id="sLang">' +
          '<option value="en"'+(S.lang==='en'?' selected':'')+'>English</option>' +
          '<option value="hi"'+(S.lang==='hi'?' selected':'')+'>हिन्दी</option></select></label>' +
        '<div class="field"><span>'+esc(t('theme'))+'</span>' +
          '<div style="display:flex;gap:8px">' +
          '<button class="pick'+(S.theme==='dark'?' on':'')+'" data-th="dark">'+ICON.moon+esc(t('dark'))+'</button>' +
          '<button class="pick'+(S.theme==='light'?' on':'')+'" data-th="light">'+ICON.sun+esc(t('light'))+'</button></div></div>' +
      '</div>' +
      '<div class="card"><div class="card-head"><h2>'+esc(t('notifications'))+' & '+esc(t('autoRefresh'))+'</h2></div>' +
        '<label class="layer-row"><span>'+esc(t('notifications'))+'<br><span class="tiny muted">Show the unread badge in the header.</span></span>' +
          '<span class="switch"><input type="checkbox" id="sNotif"'+(S.notifOn?' checked':'')+'><span class="track"></span></span></label>' +
        '<label class="layer-row"><span>'+esc(t('autoRefresh'))+'<br><span class="tiny muted">'+esc(t('autoRefreshNote'))+'</span></span>' +
          '<span class="switch"><input type="checkbox" id="sAuto"'+(S.autoRefresh?' checked':'')+'><span class="track"></span></span></label>' +
      '</div>' +
      '<div class="card"><div class="card-head"><h2>'+esc(t('dataModeL'))+'</h2></div>' +
        '<div style="display:flex;gap:8px;margin-bottom:10px">' +
        '<button class="pick'+(S.dataMode==='demo'?' on':'')+'" data-dm="demo">'+esc(t('modeDemo'))+'</button>' +
        '<button class="pick'+(S.dataMode==='api'?' on':'')+'" data-dm="api">'+esc(t('modeApi'))+'</button></div>' +
        '<div class="banner">'+ICON.info+'<div id="apiNoteText">'+esc('Live AQI is fetched server-side through Vercel. The WAQI token is never exposed to the browser.')+'</div></div>'+'<div style="margin-top:10px"><button class="btn btn-sm" id="checkLive">Check live service</button><span id="liveDiag" class="tiny muted" style="margin-left:9px"></span></div>' +
        '<div class="divider"></div>' +
        '<div class="stat-row"><span>Stored citizen reports</span><b>'+Object.values(S.reports).reduce((a,v)=>a+v.length,0)+'</b></div>' +
        '<div class="stat-row"><span>Dispatched alerts</span><b>'+S.alerts.length+'</b></div>' +
        '<div class="stat-row"><span>Read notifications</span><b>'+S.readNotifs.length+'</b></div>' +
      '</div>' +
      '<div class="card"><div class="card-head"><h2>'+esc(t('resetDemo'))+'</h2></div>' +
        '<p class="small muted">'+esc(t('resetNote'))+'</p>' +
        '<button class="btn btn-danger" id="sReset">'+ICON.reset+esc(t('resetDemo'))+'</button></div>' +
    '</div>';

  $('#checkLive')?.addEventListener('click', async ()=>{ const b=$('#checkLive'),o=$('#liveDiag'); b.disabled=true; o.textContent='Checking…'; const s=await checkLiveService(); o.textContent=s.ok?'WAQI connected and returning live data.':(s.tokenConfigured?(s.error||'WAQI is not reachable or returned no live station data.'):'WAQI_TOKEN is missing in Vercel.'); b.disabled=false; });

  $('#sLang').onchange = e => { S.lang = e.target.value; save(); applyLang(); rerender(); toast(t('saved')); };
  $$('[data-th]', v).forEach(b => b.onclick = () => { S.theme = b.dataset.th; save(); applyTheme(); rerender(); toast(t('saved')); });
  $('#sNotif').onchange = e => { S.notifOn = e.target.checked; save(); paintBell(); toast(t('saved')); };
  $('#sAuto').onchange = e => { S.autoRefresh = e.target.checked; save(); setAutoRefresh(S.autoRefresh); toast(t('saved')); };
  $$('[data-dm]', v).forEach(b => b.onclick = async () => {
    S.dataMode = b.dataset.dm; save(); rerender();
    if (S.dataMode === 'api'){
      const ok = await applyLiveData(S.city);
      rerender(); paintBell();
      toast(ok ? t('saved') : t('apiFail'), ok ? 'ok' : 'warn', ok ? ICON.check : ICON.info);
    } else {
      toast(t('saved'));
    }
  });
  $('#sReset').onclick = () => {
    modal({
      title: esc(t('resetConfirm')),
      body:'<div class="banner bad">'+ICON.alerts+'<div>'+esc(t('resetConfirmBody'))+'</div></div>',
      foot:'<button class="btn" data-close>'+esc(t('cancel'))+'</button>' +
        '<button class="btn btn-danger" id="resetYes">'+ICON.reset+esc(t('resetDemo'))+'</button>'
    });
    $('#resetYes').onclick = () => {
      try{ localStorage.removeItem(LS_KEY); }catch(e){}
      S = Object.assign({}, DEFAULTS, {reports:{}, alerts:[], acked:{}, assigned:{}, readNotifs:[], dismissedNotifs:[], extraNotifs:[]});
      HOT_RUN = {}; FC_SALT = {};
      save(); closeModal(); applyTheme(); applyLang(); setAutoRefresh(false); paintBell(); rerender();
      toast(t('resetDone'), 'ok', ICON.reset);
    };
  };
};

