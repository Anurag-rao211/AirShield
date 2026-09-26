"use strict";
/* ============================================================
   AirShield — prototype front end
   All environmental figures are simulated demo data.
   ============================================================ */

/* ---------- tiny helpers ---------- */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const el = (tag, cls, html) => { const n=document.createElement(tag); if(cls) n.className=cls; if(html!=null) n.innerHTML=html; return n; };
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const rnd = (min,max,f=0) => { const v = min + Math.random()*(max-min); return f? +v.toFixed(f) : Math.round(v); };
const pad = n => String(n).padStart(2,'0');
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));

function fmtTime(d){ d = new Date(d); return pad(d.getHours())+':'+pad(d.getMinutes()); }
function fmtDate(d){ d = new Date(d); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function fmtDateTime(d){ return fmtDate(d)+' '+fmtTime(d); }
function ago(ts){
  const s = Math.max(1, Math.round((Date.now()-new Date(ts).getTime())/1000));
  if (s < 60) return t('agoSec').replace('{n}', s);
  const m = Math.round(s/60); if (m < 60) return t('agoMin').replace('{n}', m);
  const h = Math.round(m/60); if (h < 24) return t('agoHr').replace('{n}', h);
  return t('agoDay').replace('{n}', Math.round(h/24));
}

/* deterministic pseudo-random so each city looks consistent between visits */
function seedOf(str){ let h = 2166136261; for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rngFrom(str){
  let a = seedOf(str);
  return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a>>>15, 1|a); t = t + Math.imul(t ^ t>>>7, 61|t) ^ t; return ((t ^ t>>>14)>>>0)/4294967296; };
}
const pick = (r, arr) => arr[Math.floor(r()*arr.length)];
const between = (r,a,b,f=0) => { const v = a + r()*(b-a); return f? +v.toFixed(f) : Math.round(v); };

/* ---------- icons ---------- */
const P = (d, extra='') => `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const ICON = {
  dashboard: P('<rect x="3" y="3" width="7.5" height="8.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="5" rx="2"/><rect x="13.5" y="11" width="7.5" height="10" rx="2"/><rect x="3" y="14.5" width="7.5" height="6.5" rx="2"/>'),
  map: P('<path d="M9 3 3 5.4v15.1L9 18l6 3 6-2.4V3.4L15 6z"/><path d="M9 3v15M15 6v15"/>'),
  reports: P('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
  ai: P('<path d="M12 3v2.4"/><rect x="4.6" y="5.4" width="14.8" height="13.2" rx="3.6"/><path d="M9.4 11.6h.01M14.6 11.6h.01M9.6 15.4h4.8M2.6 11.4v2.6M21.4 11.4v2.6"/>'),
  forecast: P('<path d="M3 17.5 8 11l4 3.6L21 5"/><path d="M21 9.5V5h-4.4"/>'),
  analytics: P('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  alerts: P('<path d="M10.3 3.9 2.6 17.2A1.8 1.8 0 0 0 4.2 20h15.6a1.8 1.8 0 0 0 1.6-2.8L13.7 3.9a1.9 1.9 0 0 0-3.4 0z"/><path d="M12 9.4v4M12 16.8h.01"/>'),
  infra: P('<path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M10 21v-5h4v5M10.5 11h3"/>'),
  compare: P('<path d="M5 3v18M19 3v18M5 8h14M5 16h14"/>'),
  network: P('<circle cx="12" cy="5" r="2.4"/><circle cx="5" cy="19" r="2.4"/><circle cx="19" cy="19" r="2.4"/><path d="M12 7.4v4.2M12 11.6 6.6 16.8M12 11.6l5.4 5.2"/>'),
  settings: P('<circle cx="12" cy="12" r="3.1"/><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.1 1.1z"/>'),
  sensor: P('<circle cx="12" cy="12" r="2.3"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 16.2a6 6 0 0 0 0-8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 19.1a10 10 0 0 0 0-14.2"/>'),
  wind: P('<path d="M3 8h10a3 3 0 1 0-3-3M3 12.5h14.5a3 3 0 1 1-3 3M3 17h8a2.5 2.5 0 1 1-2.5 2.5"/>'),
  close: P('<path d="M6 6l12 12M18 6 6 18"/>'),
  check: P('<path d="M4 12.5 9.5 18 20 6.5"/>'),
  download: P('<path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4 20h16"/>'),
  send: P('<path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 10z"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'),
  filter: P('<path d="M3 5h18l-7 8.2V20l-4 1v-7.8z"/>'),
  eye: P('<path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/>'),
  people: P('<circle cx="9" cy="8" r="3.2"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0M16.5 5.2a3.2 3.2 0 0 1 0 5.9M18 13.6a6.2 6.2 0 0 1 3.2 5.4"/>'),
  reset: P('<path d="M3 3v6h6"/><path d="M3.5 13a9 9 0 1 0 2.2-6.4L3 9"/>'),
  info: P('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8h.01"/>'),
  moon: P('<path d="M20.5 14.5A8.6 8.6 0 0 1 9.5 3.5a8.6 8.6 0 1 0 11 11z"/>'),
  sun: P('<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/>'),
  bell: P('<path d="M18 8a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 14 18 8z"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/>'),
  user: P('<circle cx="12" cy="8.2" r="3.6"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>'),
  logout: P('<path d="M15 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H15M18.5 12H10m8.5 0-3.3-3.3M18.5 12l-3.3 3.3"/>'),
  target: P('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 1.8v2.6M12 19.6v2.6M1.8 12h2.6M19.6 12h2.6"/>')
};

/* ---------- language ---------- */
const T = {
  en: {
    tagline:'Detect. Predict. Respond.', demoMode:'DEMO MODE',
    demoNote:'Environmental data shown here is simulated. Not for real-world decision making.',
    searchPh:'Search city or location...',
    grpMonitor:'Monitor', grpIntel:'Intelligence', grpRespond:'Respond', grpSystem:'System',
    navDashboard:'Dashboard', navMap:'Live pollution map', navReports:'Citizen reports',
    navHotspots:'AI hotspot detection', navForecast:'AQI forecast', navAnalytics:'Climate analytics',
    navAlerts:'Alerts & response', navInfra:'Infrastructure risk', navCompare:'City comparison',
    navData:'Data & federation', navSettings:'Settings',
    dashTitle:'AirShield climate intelligence', dashSub:'Live operating picture for {city} — sensors, citizen reports and AI signals in one view.',
    kpiAqi:'Current AQI', kpiHotspots:'Active pollution hotspots', kpiReports:'Citizen reports today',
    kpiAlerts:'Air quality alerts', kpiSensors:'Sensors online', kpiRisk:'Forecast risk',
    refresh:'Refresh', updated:'Updated {t}', next24:'Next 24 hours',
    pm25:'PM2.5', pm10:'PM10', no2:'NO₂', so2:'SO₂', co:'CO', o3:'O₃',
    agoSec:'{n}s ago', agoMin:'{n} min ago', agoHr:'{n} h ago', agoDay:'{n} d ago',
    weatherNow:'Weather now', temp:'Temperature', humidity:'Humidity', wind:'Wind', windDir:'Wind direction', visibility:'Visibility',
    recentReports:'Recent citizen reports', viewAll:'View all', topHotspots:'Priority hotspots',
    trend12:'AQI, last 12 hours', pollutantMix:'Pollutant mix right now',
    mapTitle:'Live pollution map', mapSub:'Schematic city view of {city}. Tap any marker for readings. Layers can be switched off.',
    layers:'Map layers', lSensors:'Sensors', lReports:'Citizen reports', lHotspots:'Pollution hotspots',
    lIndustry:'Industrial areas', lWeather:'Weather', lHeat:'AQI intensity',
    riskLevel:'Risk level', location:'Location', lastUpdated:'Last updated',
    reportsTitle:'Citizen reports', reportsSub:'Reports submitted by residents of {city}, scored by the AI triage model.',
    newReport:'Report pollution', searchReports:'Search reports...', allSeverity:'All severity', allType:'All types', allStatus:'All statuses',
    colId:'Report ID', colLocation:'Location', colType:'Type', colSeverity:'Severity', colDate:'Date', colStatus:'Status', colConfidence:'AI confidence',
    noReports:'No reports match these filters. Clear a filter to see more.',
    clearFilters:'Clear filters', exportCsv:'Download CSV',
    sevLow:'Low', sevMedium:'Medium', sevHigh:'High', sevCritical:'Critical',
    stNew:'New', stInvestigating:'Under investigation', stVerified:'Verified', stResolved:'Resolved',
    tIndustrial:'Industrial emission', tAgri:'Agricultural burning', tDust:'Construction dust',
    tVehicle:'Vehicle pollution', tGarbage:'Garbage burning', tSmoke:'Smoke', tUnknown:'Unknown',
    formName:'Name (optional)', formLocation:'Location', formType:'Pollution type', formDesc:'What did you see?',
    formWhen:'Date and time', formSeverity:'Severity', formPhoto:'Photo', formSensor:'Sensor reading (optional)',
    photoHint:'Tap to attach a photo from your device', submitReport:'Submit report', cancel:'Cancel', close:'Close',
    errLocation:'Enter a location so the report can be mapped.', errFields:'Complete the required fields to submit.',
    reportOk:'Report submitted. Reference {id}.',
    hotTitle:'AI pollution hotspot detection',
    hotSub:'The AI engine combines citizen reports, local sensor observations, satellite-style observations and meteorological conditions to identify probable pollution hotspots.',
    runDetection:'Run AI detection', analyzing:'Analyzing environmental signals...', simulated:'Simulated analysis — prototype only',
    confidence:'Confidence', likelySource:'Likely source', recommended:'Recommended response',
    population:'Nearby population', nearbyInfra:'Nearby infrastructure', viewDetails:'View details', sendAlert:'Send alert',
    hotIdle:'Run the detection engine to score the current signals for {city}.',
    fcTitle:'24-hour AQI forecast', fcSub:'Short-range prediction blending sensor history with meteorological conditions.',
    generate:'Generate forecast', generating:'Generating forecast...', fcPeak:'Predicted peak',
    fcMsg:'Potential AQI spike detected between {a} and {b}.', fcCalm:'No major spike expected in the next 24 hours.',
    anTitle:'Climate analytics', anSub:'Pollution behaviour over time, by pollutant and by probable source.',
    trend7:'AQI, last {n} days', breakdown:'Pollutant breakdown', sources:'Source distribution', weatherCorr:'Weather and AQI',
    range7:'7 days', range14:'14 days', range30:'30 days',
    alTitle:'Alerts & response', alSub:'Dispatch and track advisories to the agencies responsible for {city}.',
    critical:'Critical alerts', history:'Alert history', acknowledge:'Acknowledge', acknowledged:'Acknowledged',
    assignTeam:'Assign team', assigned:'Assigned to {team}', newAlert:'New alert',
    recipient:'Recipient', priority:'Priority', message:'Message', dispatch:'Send alert',
    alertSent:'Alert dispatched to {to}.', noAlerts:'No alerts yet. Dispatch one from a hotspot or create a new alert.',
    infraTitle:'Infrastructure risk', infraSub:'Exposure of critical facilities in {city} to current and forecast air quality.',
    vulnerability:'Vulnerability score', exposure:'Population exposure', action:'Recommended action',
    cmpTitle:'City comparison', cmpSub:'Select cities to compare simulated air quality and response load.',
    cmpPick:'Pick at least one city to build the comparison.',
    dataTitle:'Data & federation', dataSub:'How a reading becomes a response, and how cities share models without sharing raw data.',
    pipeline:'Signal pipeline', federated:'Federated learning across cities',
    fedActive:'Federated synchronization: Active', citiesConnected:'Cities connected', modelsSynced:'Models synchronized',
    syncNow:'Synchronize models', syncing:'Synchronizing city models...', syncDone:'All city models synchronized.',
    liveData:'Live API data', demoData:'Demo / simulated data',
    setTitle:'Settings', setSub:'Preferences are stored in this browser only.',
    language:'Language', theme:'Theme', light:'Light', dark:'Dark', notifications:'Notifications',
    autoRefresh:'Auto-refresh', autoRefreshNote:'Re-reads sensor values every 30 seconds.',
    dataModeL:'Data mode', modeDemo:'Demo data', modeApi:'API mode',
    apiNote:'Live AQI is the default. If the Vercel WAQI service is unavailable, AirShield reports the live-data error instead of claiming demo readings are live.',
    resetDemo:'Reset demo data', resetNote:'Deletes reports, alerts and preferences saved in this browser.',
    resetConfirm:'Reset all demo data?', resetConfirmBody:'Your submitted reports, dispatched alerts and saved preferences will be deleted from this browser. Seeded demo content will be restored.',
    resetDone:'Demo data reset.', saved:'Saved.',
    notifTitle:'Notifications', markAll:'Mark all as read', noNotifs:'Nothing new right now.',
    aiTitle:'AirShield AI', aiNote:'AI responses are simulated for this prototype.',
    aiPh:'Ask about air quality...', aiHello:'Ask me about the current AQI, hotspots, reports or the forecast for {city}.',
    profile:'Profile', signedIn:'Signed in as', viewProfile:'View profile', signOut:'Sign out',
    apiFail:'Live data unavailable. Showing demo data.', refreshed:'Sensor values refreshed.',
    downloadReport:'Download report', downloaded:'Report downloaded.',
    catGood:'Good', catSatisfactory:'Satisfactory', catModerate:'Moderate', catPoor:'Poor', catVPoor:'Very poor', catSevere:'Severe',
    back:'Back'
  },
  hi: {
    tagline:'पहचानें। पूर्वानुमान। कार्रवाई।', demoMode:'डेमो मोड',
    demoNote:'यहाँ दिखाया गया पर्यावरण डेटा सिम्युलेटेड है। वास्तविक निर्णयों के लिए नहीं।',
    searchPh:'शहर या स्थान खोजें...',
    grpMonitor:'निगरानी', grpIntel:'विश्लेषण', grpRespond:'प्रतिक्रिया', grpSystem:'सिस्टम',
    navDashboard:'डैशबोर्ड', navMap:'प्रदूषण मानचित्र', navReports:'नागरिक रिपोर्ट',
    navHotspots:'एआई हॉटस्पॉट पहचान', navForecast:'एक्यूआई पूर्वानुमान', navAnalytics:'जलवायु विश्लेषण',
    navAlerts:'चेतावनियाँ एवं कार्रवाई', navInfra:'बुनियादी ढाँचा जोखिम', navCompare:'शहर तुलना',
    navData:'डेटा एवं फेडरेशन', navSettings:'सेटिंग्स',
    dashTitle:'एयरशील्ड जलवायु इंटेलिजेंस', dashSub:'{city} की वर्तमान स्थिति — सेंसर, नागरिक रिपोर्ट और एआई संकेत एक साथ।',
    kpiAqi:'वर्तमान एक्यूआई', kpiHotspots:'सक्रिय प्रदूषण हॉटस्पॉट', kpiReports:'आज की नागरिक रिपोर्ट',
    kpiAlerts:'वायु गुणवत्ता चेतावनियाँ', kpiSensors:'सेंसर ऑनलाइन', kpiRisk:'पूर्वानुमान जोखिम',
    refresh:'रिफ़्रेश', updated:'{t} अपडेट किया गया', next24:'अगले 24 घंटे',
    pm25:'पीएम2.5', pm10:'पीएम10', no2:'NO₂', so2:'SO₂', co:'CO', o3:'O₃',
    agoSec:'{n} सेकंड पहले', agoMin:'{n} मिनट पहले', agoHr:'{n} घंटे पहले', agoDay:'{n} दिन पहले',
    weatherNow:'मौसम', temp:'तापमान', humidity:'आर्द्रता', wind:'हवा', windDir:'हवा की दिशा', visibility:'दृश्यता',
    recentReports:'हाल की नागरिक रिपोर्ट', viewAll:'सभी देखें', topHotspots:'प्राथमिक हॉटस्पॉट',
    trend12:'पिछले 12 घंटे का एक्यूआई', pollutantMix:'वर्तमान प्रदूषक मिश्रण',
    mapTitle:'लाइव प्रदूषण मानचित्र', mapSub:'{city} का योजनाबद्ध मानचित्र। रीडिंग देखने के लिए मार्कर चुनें।',
    layers:'मानचित्र लेयर', lSensors:'सेंसर', lReports:'नागरिक रिपोर्ट', lHotspots:'प्रदूषण हॉटस्पॉट',
    lIndustry:'औद्योगिक क्षेत्र', lWeather:'मौसम', lHeat:'एक्यूआई तीव्रता',
    riskLevel:'जोखिम स्तर', location:'स्थान', lastUpdated:'अंतिम अपडेट',
    reportsTitle:'नागरिक रिपोर्ट', reportsSub:'{city} के निवासियों द्वारा दर्ज रिपोर्ट, एआई द्वारा वर्गीकृत।',
    newReport:'प्रदूषण की रिपोर्ट करें', searchReports:'रिपोर्ट खोजें...', allSeverity:'सभी गंभीरता', allType:'सभी प्रकार', allStatus:'सभी स्थितियाँ',
    colId:'रिपोर्ट आईडी', colLocation:'स्थान', colType:'प्रकार', colSeverity:'गंभीरता', colDate:'दिनांक', colStatus:'स्थिति', colConfidence:'एआई विश्वास',
    noReports:'इन फ़िल्टर से कोई रिपोर्ट नहीं मिली। कोई फ़िल्टर हटाएँ।',
    clearFilters:'फ़िल्टर हटाएँ', exportCsv:'सीएसवी डाउनलोड करें',
    sevLow:'कम', sevMedium:'मध्यम', sevHigh:'उच्च', sevCritical:'गंभीर',
    stNew:'नई', stInvestigating:'जाँच जारी', stVerified:'सत्यापित', stResolved:'समाधान हुआ',
    tIndustrial:'औद्योगिक उत्सर्जन', tAgri:'पराली जलाना', tDust:'निर्माण धूल',
    tVehicle:'वाहन प्रदूषण', tGarbage:'कचरा जलाना', tSmoke:'धुआँ', tUnknown:'अज्ञात',
    formName:'नाम (वैकल्पिक)', formLocation:'स्थान', formType:'प्रदूषण का प्रकार', formDesc:'आपने क्या देखा?',
    formWhen:'दिनांक और समय', formSeverity:'गंभीरता', formPhoto:'फ़ोटो', formSensor:'सेंसर रीडिंग (वैकल्पिक)',
    photoHint:'फ़ोटो जोड़ने के लिए टैप करें', submitReport:'रिपोर्ट भेजें', cancel:'रद्द करें', close:'बंद करें',
    errLocation:'कृपया स्थान दर्ज करें।', errFields:'कृपया आवश्यक फ़ील्ड भरें।',
    reportOk:'रिपोर्ट दर्ज हुई। संदर्भ {id}।',
    hotTitle:'एआई प्रदूषण हॉटस्पॉट पहचान',
    hotSub:'एआई इंजन नागरिक रिपोर्ट, स्थानीय सेंसर, उपग्रह-शैली अवलोकन और मौसम स्थितियों को जोड़कर संभावित प्रदूषण हॉटस्पॉट पहचानता है।',
    runDetection:'एआई पहचान चलाएँ', analyzing:'पर्यावरणीय संकेतों का विश्लेषण...', simulated:'सिम्युलेटेड विश्लेषण — केवल प्रोटोटाइप',
    confidence:'विश्वास', likelySource:'संभावित स्रोत', recommended:'अनुशंसित कार्रवाई',
    population:'निकटवर्ती जनसंख्या', nearbyInfra:'निकट अवसंरचना', viewDetails:'विवरण देखें', sendAlert:'चेतावनी भेजें',
    hotIdle:'{city} के वर्तमान संकेतों का आकलन करने के लिए इंजन चलाएँ।',
    fcTitle:'24 घंटे का एक्यूआई पूर्वानुमान', fcSub:'सेंसर इतिहास और मौसम स्थितियों पर आधारित अल्पकालिक पूर्वानुमान।',
    generate:'पूर्वानुमान बनाएँ', generating:'पूर्वानुमान बनाया जा रहा है...', fcPeak:'अनुमानित शिखर',
    fcMsg:'{a} से {b} के बीच एक्यूआई बढ़ने की संभावना।', fcCalm:'अगले 24 घंटों में बड़ी वृद्धि अपेक्षित नहीं।',
    anTitle:'जलवायु विश्लेषण', anSub:'समय, प्रदूषक और स्रोत के अनुसार प्रदूषण का व्यवहार।',
    trend7:'पिछले {n} दिनों का एक्यूआई', breakdown:'प्रदूषक विभाजन', sources:'स्रोत वितरण', weatherCorr:'मौसम और एक्यूआई',
    range7:'7 दिन', range14:'14 दिन', range30:'30 दिन',
    alTitle:'चेतावनियाँ एवं कार्रवाई', alSub:'{city} के लिए ज़िम्मेदार एजेंसियों को सूचनाएँ भेजें और ट्रैक करें।',
    critical:'गंभीर चेतावनियाँ', history:'चेतावनी इतिहास', acknowledge:'स्वीकार करें', acknowledged:'स्वीकृत',
    assignTeam:'टीम नियुक्त करें', assigned:'{team} को सौंपा गया', newAlert:'नई चेतावनी',
    recipient:'प्राप्तकर्ता', priority:'प्राथमिकता', message:'संदेश', dispatch:'चेतावनी भेजें',
    alertSent:'{to} को चेतावनी भेजी गई।', noAlerts:'अभी कोई चेतावनी नहीं। हॉटस्पॉट से भेजें या नई बनाएँ।',
    infraTitle:'बुनियादी ढाँचा जोखिम', infraSub:'{city} की महत्वपूर्ण सुविधाओं पर वायु गुणवत्ता का प्रभाव।',
    vulnerability:'भेद्यता स्कोर', exposure:'जनसंख्या जोखिम', action:'अनुशंसित कार्रवाई',
    cmpTitle:'शहर तुलना', cmpSub:'तुलना के लिए शहर चुनें।',
    cmpPick:'तुलना बनाने के लिए कम से कम एक शहर चुनें।',
    dataTitle:'डेटा एवं फेडरेशन', dataSub:'एक रीडिंग कैसे कार्रवाई बनती है, और शहर कच्चा डेटा साझा किए बिना मॉडल कैसे साझा करते हैं।',
    pipeline:'संकेत प्रवाह', federated:'शहरों के बीच फेडरेटेड लर्निंग',
    fedActive:'फेडरेटेड सिंक्रोनाइज़ेशन: सक्रिय', citiesConnected:'जुड़े शहर', modelsSynced:'सिंक्रोनाइज़्ड मॉडल',
    syncNow:'मॉडल सिंक करें', syncing:'शहर मॉडल सिंक्रोनाइज़ हो रहे हैं...', syncDone:'सभी शहर मॉडल सिंक्रोनाइज़ हुए।',
    liveData:'लाइव एपीआई डेटा', demoData:'डेमो / सिम्युलेटेड डेटा',
    setTitle:'सेटिंग्स', setSub:'प्राथमिकताएँ केवल इसी ब्राउज़र में सहेजी जाती हैं।',
    language:'भाषा', theme:'थीम', light:'लाइट', dark:'डार्क', notifications:'सूचनाएँ',
    autoRefresh:'ऑटो-रिफ़्रेश', autoRefreshNote:'हर 30 सेकंड में सेंसर मान पढ़ता है।',
    dataModeL:'डेटा मोड', modeDemo:'डेमो डेटा', modeApi:'एपीआई मोड',
    apiNote:'कोई एपीआई कुंजी नहीं है, इसलिए डेमो डेटा दिखाया जा रहा है।',
    resetDemo:'डेमो डेटा रीसेट करें', resetNote:'इस ब्राउज़र में सहेजी रिपोर्ट, चेतावनियाँ और सेटिंग्स हटाता है।',
    resetConfirm:'सारा डेमो डेटा रीसेट करें?', resetConfirmBody:'आपकी रिपोर्ट, भेजी गई चेतावनियाँ और सेटिंग्स हटा दी जाएँगी।',
    resetDone:'डेमो डेटा रीसेट हुआ।', saved:'सहेजा गया।',
    notifTitle:'सूचनाएँ', markAll:'सभी पढ़ी हुई चिह्नित करें', noNotifs:'अभी कुछ नया नहीं।',
    aiTitle:'एयरशील्ड एआई', aiNote:'इस प्रोटोटाइप में एआई उत्तर सिम्युलेटेड हैं।',
    aiPh:'वायु गुणवत्ता के बारे में पूछें...', aiHello:'{city} के एक्यूआई, हॉटस्पॉट, रिपोर्ट या पूर्वानुमान के बारे में पूछें।',
    profile:'प्रोफ़ाइल', signedIn:'लॉग इन:', viewProfile:'प्रोफ़ाइल देखें', signOut:'साइन आउट',
    apiFail:'लाइव डेटा उपलब्ध नहीं। डेमो डेटा दिखाया जा रहा है।', refreshed:'सेंसर मान अपडेट हुए।',
    downloadReport:'रिपोर्ट डाउनलोड करें', downloaded:'रिपोर्ट डाउनलोड हुई।',
    catGood:'अच्छा', catSatisfactory:'संतोषजनक', catModerate:'मध्यम', catPoor:'खराब', catVPoor:'बहुत खराब', catSevere:'गंभीर',
    back:'वापस'
  }
};
function t(k){ const L = S.lang || 'en'; return (T[L] && T[L][k]) || T.en[k] || k; }
function tf(k, vars){ let s = t(k); for (const key in vars) s = s.replace('{'+key+'}', vars[key]); return s; }

/* ---------- persisted state ---------- */
const LS_KEY = 'airshield.v2';
const DEFAULTS = {
  lang:'en', theme:'dark', city:'delhi', page:'dashboard',
  notifOn:true, autoRefresh:true, dataMode:'api',
  reports:{}, alerts:[], acked:{}, assigned:{}, readNotifs:[], dismissedNotifs:[], extraNotifs:[]
};
let S = load();
function load(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    return raw ? Object.assign({}, DEFAULTS, JSON.parse(raw)) : Object.assign({}, DEFAULTS);
  }catch(e){ return Object.assign({}, DEFAULTS); }
}
function save(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(S)); }
  catch(e){ /* storage may be unavailable; the app still runs in memory */ }
}

/* ---------- AQI scale (CPCB bands, used across the app) ---------- */
const BANDS = [
  {max:50,  key:'catGood',         v:'--good'},
  {max:100, key:'catSatisfactory', v:'--ok'},
  {max:200, key:'catModerate',     v:'--moderate'},
  {max:300, key:'catPoor',         v:'--poor'},
  {max:400, key:'catVPoor',        v:'--vpoor'},
  {max:9999,key:'catSevere',       v:'--severe'}
];
const band = a => BANDS.find(b => a <= b.max);
const aqiColor = a => `var(${band(a).v})`;
const aqiCat = a => t(band(a).key);
const RISK = { Critical:'--vpoor', High:'--poor', Medium:'--moderate', Low:'--ok' };
const riskColor = r => `var(${RISK[r] || '--ok'})`;
const SEV_KEY = { Low:'sevLow', Medium:'sevMedium', High:'sevHigh', Critical:'sevCritical' };
const ST_KEY  = { New:'stNew', Investigating:'stInvestigating', Verified:'stVerified', Resolved:'stResolved' };
const TYPE_KEY= { Industrial:'tIndustrial', Agricultural:'tAgri', Dust:'tDust', Vehicle:'tVehicle', Garbage:'tGarbage', Smoke:'tSmoke', Unknown:'tUnknown' };
const sevLabel = s => t(SEV_KEY[s] || 'sevLow');
const stLabel  = s => t(ST_KEY[s] || 'stNew');
const typeLabel= s => t(TYPE_KEY[s] || 'tUnknown');

function chip(label, colorVar){
  return `<span class="chip" style="color:${colorVar};background:color-mix(in srgb, ${colorVar} 14%, transparent);border-color:color-mix(in srgb, ${colorVar} 32%, transparent)"><i class="chip-dot"></i>${esc(label)}</span>`;
}

/* ---------- demo city dataset ---------- */
const CITY_DEFS = {
  delhi:   { name:'Delhi',   hi:'दिल्ली',  base:268, temp:24, hum:52, wind:8,  pop:'32.9M', river:'Yamuna',
    areas:['Anand Vihar','Rohini','Dwarka','Okhla Phase II','Punjabi Bagh','Jahangirpuri','Mundka','ITO Junction','Najafgarh','Wazirpur','Bawana','Narela'] },
  kanpur:  { name:'Kanpur',  hi:'कानपुर',  base:231, temp:26, hum:58, wind:6,  pop:'3.1M', river:'Ganga',
    areas:['Jajmau Tannery Belt','Panki Industrial Area','Kidwai Nagar','Govind Nagar','Fazalganj','Kalyanpur','Barra','Ramadevi Crossing','Shyam Nagar','Vijay Nagar','Naubasta','Chakeri'] },
  mumbai:  { name:'Mumbai',  hi:'मुंबई',   base:158, temp:31, hum:74, wind:14, pop:'21.7M', river:'Mithi',
    areas:['Bandra Kurla Complex','Worli','Chembur','Mazgaon','Andheri East','Malad West','Borivali','Sion','Colaba','Powai','Deonar','Vikhroli'] },
  kolkata: { name:'Kolkata', hi:'कोलकाता', base:196, temp:29, hum:68, wind:9,  pop:'15.1M', river:'Hooghly',
    areas:['Rabindra Bharati','Ballygunge','Jadavpur','Bidhannagar','Howrah Bridge Corridor','Behala','Tollygunge','Salt Lake Sector V','Dum Dum','Kasba','Garden Reach','Baranagar'] },
  lucknow: { name:'Lucknow', hi:'लखनऊ',    base:205, temp:27, hum:55, wind:7,  pop:'3.9M', river:'Gomti',
    areas:['Gomti Nagar','Aliganj','Talkatora Industrial Area','Lalbagh','Hazratganj','Chinhat','Indira Nagar','Amausi','Aishbagh','Rajajipuram','Charbagh','Sarojini Nagar'] },
  patna:   { name:'Patna',   hi:'पटना',    base:214, temp:28, hum:61, wind:6,  pop:'2.6M', river:'Ganga',
    areas:['Rajbansi Nagar','Danapur','Muradpur','Samanpura','Patliputra Colony','Kankarbagh','Gandhi Maidan','Boring Road','Phulwari Sharif','Rajendra Nagar','Bailey Road','Digha Ghat'] },
  hyderabad: { name:'Hyderabad', hi:'हैदराबाद', base:154, temp:24, hum:47, wind:10, state:'Telangana', river:'Musi',
    areas:['Hyderabad Old City','Hyderabad Railway Colony','Hyderabad Bus Stand Area','Hyderabad City Centre','Hyderabad Central Market','Hyderabad Ring Road','Hyderabad Civil Lines','Hyderabad Cantonment','Hyderabad Lake View Colony','Hyderabad Housing Board Colony','Hyderabad Model Town','Hyderabad New Township'] },
  bengaluru: { name:'Bengaluru', hi:'बेंगलुरु', base:138, temp:26, hum:47, wind:8, state:'Karnataka', river:'Local Waterway',
    areas:['Bengaluru Housing Board Colony','Bengaluru Railway Colony','Bengaluru City Centre','Bengaluru Civil Lines','Bengaluru Airport Road','Bengaluru Riverside Colony','Bengaluru Cantonment','Bengaluru Central Market','Bengaluru University Road','Bengaluru New Township','Bengaluru Textile Mill Area','Bengaluru Old City'] },
  chennai: { name:'Chennai', hi:'चेन्नई', base:145, temp:29, hum:73, wind:12, state:'Tamil Nadu', river:'Local Waterway',
    areas:['Chennai Housing Board Colony','Chennai Lake View Colony','Chennai Old City','Chennai Bus Stand Area','Chennai Civil Lines','Chennai Industrial Area','Chennai Cantonment','Chennai Textile Mill Area','Chennai Railway Colony','Chennai University Road','Chennai Ring Road','Chennai Riverside Colony'] },
  ahmedabad: { name:'Ahmedabad', hi:'अहमदाबाद', base:211, temp:35, hum:37, wind:12, state:'Gujarat', river:'Sabarmati',
    areas:['Ahmedabad Industrial Area','Ahmedabad City Centre','Ahmedabad Riverside Colony','Ahmedabad Model Town','Ahmedabad Railway Colony','Ahmedabad Old City','Ahmedabad Bus Stand Area','Ahmedabad Housing Board Colony','Ahmedabad Textile Mill Area','Ahmedabad New Township','Ahmedabad Cantonment','Ahmedabad Central Market'] },
  surat: { name:'Surat', hi:'सूरत', base:138, temp:30, hum:74, wind:13, state:'Gujarat', river:'Tapi',
    areas:['Surat Railway Colony','Surat Lake View Colony','Surat University Road','Surat Housing Board Colony','Surat Sector 1','Surat Riverside Colony','Surat City Centre','Surat Ring Road','Surat Model Town','Surat Textile Mill Area','Surat Industrial Area','Surat New Township'] },
  pune: { name:'Pune', hi:'पुणे', base:162, temp:24, hum:54, wind:8, state:'Maharashtra', river:'Mula-Mutha',
    areas:['Pune University Road','Pune Model Town','Pune Central Market','Pune Textile Mill Area','Pune Sector 1','Pune Old City','Pune City Centre','Pune Cantonment','Pune Airport Road','Pune Lake View Colony','Pune Housing Board Colony','Pune Riverside Colony'] },
  jaipur: { name:'Jaipur', hi:'जयपुर', base:190, temp:35, hum:30, wind:12, state:'Rajasthan', river:'Amanishah',
    areas:['Jaipur Railway Colony','Jaipur Airport Road','Jaipur Housing Board Colony','Jaipur University Road','Jaipur Industrial Area','Jaipur Sector 1','Jaipur Civil Lines','Jaipur Riverside Colony','Jaipur Ring Road','Jaipur Textile Mill Area','Jaipur Cantonment','Jaipur Central Market'] },
  bhopal: { name:'Bhopal', hi:'भोपाल', base:132, temp:28, hum:53, wind:10, state:'Madhya Pradesh', river:'Upper Lake',
    areas:['Bhopal Civil Lines','Bhopal Model Town','Bhopal Bus Stand Area','Bhopal Industrial Area','Bhopal Central Market','Bhopal Textile Mill Area','Bhopal Ring Road','Bhopal City Centre','Bhopal Riverside Colony','Bhopal Lake View Colony','Bhopal Airport Road','Bhopal Housing Board Colony'] },
  indore: { name:'Indore', hi:'इंदौर', base:139, temp:25, hum:56, wind:8, state:'Madhya Pradesh', river:'Khan',
    areas:['Indore University Road','Indore Airport Road','Indore Lake View Colony','Indore Industrial Area','Indore Model Town','Indore Cantonment','Indore New Township','Indore Housing Board Colony','Indore Old City','Indore Ring Road','Indore Sector 1','Indore Riverside Colony'] },
  nagpur: { name:'Nagpur', hi:'नागपुर', base:174, temp:27, hum:60, wind:8, state:'Maharashtra', river:'Nag',
    areas:['Nagpur Civil Lines','Nagpur Bus Stand Area','Nagpur Central Market','Nagpur Industrial Area','Nagpur Railway Colony','Nagpur Ring Road','Nagpur Lake View Colony','Nagpur Model Town','Nagpur Sector 1','Nagpur Airport Road','Nagpur Riverside Colony','Nagpur City Centre'] },
  visakhapatnam: { name:'Visakhapatnam', hi:'विशाखापत्तनम', base:144, temp:28, hum:66, wind:13, state:'Andhra Pradesh', river:'Coastal Bay',
    areas:['Visakhapatnam Ring Road','Visakhapatnam Old City','Visakhapatnam City Centre','Visakhapatnam Railway Colony','Visakhapatnam Central Market','Visakhapatnam Sector 1','Visakhapatnam Airport Road','Visakhapatnam Model Town','Visakhapatnam Housing Board Colony','Visakhapatnam Cantonment','Visakhapatnam Bus Stand Area','Visakhapatnam Riverside Colony'] },
  vijayawada: { name:'Vijayawada', hi:'विजयवाड़ा', base:130, temp:28, hum:73, wind:10, state:'Andhra Pradesh', river:'Krishna',
    areas:['Vijayawada Model Town','Vijayawada Sector 1','Vijayawada Housing Board Colony','Vijayawada New Township','Vijayawada Railway Colony','Vijayawada Old City','Vijayawada Riverside Colony','Vijayawada Lake View Colony','Vijayawada Bus Stand Area','Vijayawada Cantonment','Vijayawada Central Market','Vijayawada Textile Mill Area'] },
  amaravati: { name:'Amaravati', hi:'अमरावती', base:135, temp:31, hum:68, wind:11, state:'Andhra Pradesh', river:'Local Waterway',
    areas:['Amaravati Railway Colony','Amaravati University Road','Amaravati Lake View Colony','Amaravati Cantonment','Amaravati Textile Mill Area','Amaravati City Centre','Amaravati Bus Stand Area','Amaravati New Township','Amaravati Sector 1','Amaravati Industrial Area','Amaravati Model Town','Amaravati Riverside Colony'] },
  thiruvananthapuram: { name:'Thiruvananthapuram', hi:'तिरुवनंतपुरम', base:147, temp:32, hum:79, wind:10, state:'Kerala', river:'Local Waterway',
    areas:['Thiruvananthapuram Sector 1','Thiruvananthapuram Cantonment','Thiruvananthapuram Airport Road','Thiruvananthapuram City Centre','Thiruvananthapuram Old City','Thiruvananthapuram Industrial Area','Thiruvananthapuram Bus Stand Area','Thiruvananthapuram University Road','Thiruvananthapuram New Township','Thiruvananthapuram Railway Colony','Thiruvananthapuram Central Market','Thiruvananthapuram Riverside Colony'] },
  kochi: { name:'Kochi', hi:'कोच्चि', base:116, temp:27, hum:66, wind:13, state:'Kerala', river:'Local Waterway',
    areas:['Kochi Housing Board Colony','Kochi New Township','Kochi Railway Colony','Kochi Bus Stand Area','Kochi Central Market','Kochi Ring Road','Kochi City Centre','Kochi Model Town','Kochi University Road','Kochi Lake View Colony','Kochi Sector 1','Kochi Cantonment'] },
  kozhikode: { name:'Kozhikode', hi:'कोझिकोड', base:94, temp:32, hum:68, wind:11, state:'Kerala', river:'Local Waterway',
    areas:['Kozhikode Bus Stand Area','Kozhikode Cantonment','Kozhikode Textile Mill Area','Kozhikode Sector 1','Kozhikode Model Town','Kozhikode Lake View Colony','Kozhikode Airport Road','Kozhikode University Road','Kozhikode Industrial Area','Kozhikode Housing Board Colony','Kozhikode Ring Road','Kozhikode Railway Colony'] },
  coimbatore: { name:'Coimbatore', hi:'कोयंबटूर', base:126, temp:25, hum:46, wind:7, state:'Tamil Nadu', river:'Local Waterway',
    areas:['Coimbatore Lake View Colony','Coimbatore Bus Stand Area','Coimbatore Railway Colony','Coimbatore Cantonment','Coimbatore Old City','Coimbatore Sector 1','Coimbatore Housing Board Colony','Coimbatore Riverside Colony','Coimbatore Ring Road','Coimbatore Central Market','Coimbatore Textile Mill Area','Coimbatore Airport Road'] },
  madurai: { name:'Madurai', hi:'मदुरै', base:142, temp:33, hum:61, wind:14, state:'Tamil Nadu', river:'Local Waterway',
    areas:['Madurai Sector 1','Madurai Lake View Colony','Madurai University Road','Madurai New Township','Madurai Railway Colony','Madurai Riverside Colony','Madurai Central Market','Madurai Textile Mill Area','Madurai Civil Lines','Madurai Airport Road','Madurai Old City','Madurai City Centre'] },
  guwahati: { name:'Guwahati', hi:'गुवाहाटी', base:84, temp:25, hum:82, wind:8, state:'Assam', river:'Brahmaputra',
    areas:['Guwahati City Centre','Guwahati Housing Board Colony','Guwahati Central Market','Guwahati Model Town','Guwahati Ring Road','Guwahati Old City','Guwahati New Township','Guwahati Sector 1','Guwahati Industrial Area','Guwahati Cantonment','Guwahati Railway Colony','Guwahati Riverside Colony'] },
  dispur: { name:'Dispur', hi:'दिसपुर', base:55, temp:24, hum:72, wind:7, state:'Assam', river:'Brahmaputra',
    areas:['Dispur Railway Colony','Dispur Lake View Colony','Dispur New Township','Dispur Bus Stand Area','Dispur Old City','Dispur Cantonment','Dispur City Centre','Dispur Housing Board Colony','Dispur Civil Lines','Dispur Model Town','Dispur Central Market','Dispur Airport Road'] },
  ranchi: { name:'Ranchi', hi:'रांची', base:159, temp:28, hum:75, wind:9, state:'Jharkhand', river:'Local Waterway',
    areas:['Ranchi Bus Stand Area','Ranchi Riverside Colony','Ranchi New Township','Ranchi Industrial Area','Ranchi Model Town','Ranchi Old City','Ranchi Civil Lines','Ranchi Central Market','Ranchi Housing Board Colony','Ranchi Railway Colony','Ranchi City Centre','Ranchi Sector 1'] },
  jamshedpur: { name:'Jamshedpur', hi:'जमशेदपुर', base:160, temp:28, hum:63, wind:7, state:'Jharkhand', river:'Local Waterway',
    areas:['Jamshedpur Civil Lines','Jamshedpur New Township','Jamshedpur Model Town','Jamshedpur City Centre','Jamshedpur Old City','Jamshedpur Lake View Colony','Jamshedpur Bus Stand Area','Jamshedpur Cantonment','Jamshedpur Airport Road','Jamshedpur University Road','Jamshedpur Central Market','Jamshedpur Riverside Colony'] },
  dhanbad: { name:'Dhanbad', hi:'धनबाद', base:168, temp:29, hum:65, wind:10, state:'Jharkhand', river:'Local Waterway',
    areas:['Dhanbad Textile Mill Area','Dhanbad Central Market','Dhanbad Railway Colony','Dhanbad Industrial Area','Dhanbad Riverside Colony','Dhanbad Cantonment','Dhanbad New Township','Dhanbad Housing Board Colony','Dhanbad Old City','Dhanbad City Centre','Dhanbad Ring Road','Dhanbad Sector 1'] },
  bhubaneswar: { name:'Bhubaneswar', hi:'भुवनेश्वर', base:153, temp:27, hum:73, wind:8, state:'Odisha', river:'Kuakhai',
    areas:['Bhubaneswar New Township','Bhubaneswar Textile Mill Area','Bhubaneswar Old City','Bhubaneswar Housing Board Colony','Bhubaneswar Railway Colony','Bhubaneswar Bus Stand Area','Bhubaneswar Cantonment','Bhubaneswar Lake View Colony','Bhubaneswar Airport Road','Bhubaneswar City Centre','Bhubaneswar Riverside Colony','Bhubaneswar Model Town'] },
  cuttack: { name:'Cuttack', hi:'कटक', base:165, temp:27, hum:74, wind:10, state:'Odisha', river:'Mahanadi',
    areas:['Cuttack Industrial Area','Cuttack City Centre','Cuttack Civil Lines','Cuttack New Township','Cuttack Housing Board Colony','Cuttack Sector 1','Cuttack Model Town','Cuttack Bus Stand Area','Cuttack Cantonment','Cuttack University Road','Cuttack Textile Mill Area','Cuttack Airport Road'] },
  raipur: { name:'Raipur', hi:'रायपुर', base:117, temp:25, hum:51, wind:7, state:'Chhattisgarh', river:'Local Waterway',
    areas:['Raipur Bus Stand Area','Raipur Lake View Colony','Raipur Industrial Area','Raipur Ring Road','Raipur University Road','Raipur City Centre','Raipur Sector 1','Raipur Old City','Raipur Railway Colony','Raipur Riverside Colony','Raipur Central Market','Raipur Airport Road'] },
  panaji: { name:'Panaji', hi:'पणजी', base:100, temp:29, hum:77, wind:12, state:'Goa', river:'Local Waterway',
    areas:['Panaji Central Market','Panaji Textile Mill Area','Panaji Civil Lines','Panaji New Township','Panaji Old City','Panaji Sector 1','Panaji City Centre','Panaji Housing Board Colony','Panaji Ring Road','Panaji Riverside Colony','Panaji Model Town','Panaji Cantonment'] },
  gandhinagar: { name:'Gandhinagar', hi:'गांधीनगर', base:182, temp:33, hum:28, wind:8, state:'Gujarat', river:'Local Waterway',
    areas:['Gandhinagar Central Market','Gandhinagar Riverside Colony','Gandhinagar Housing Board Colony','Gandhinagar Textile Mill Area','Gandhinagar Model Town','Gandhinagar Civil Lines','Gandhinagar Old City','Gandhinagar University Road','Gandhinagar Sector 1','Gandhinagar Ring Road','Gandhinagar Bus Stand Area','Gandhinagar Industrial Area'] },
  vadodara: { name:'Vadodara', hi:'वडोदरा', base:162, temp:28, hum:43, wind:8, state:'Gujarat', river:'Vishwamitri',
    areas:['Vadodara Housing Board Colony','Vadodara Central Market','Vadodara City Centre','Vadodara Industrial Area','Vadodara Lake View Colony','Vadodara Bus Stand Area','Vadodara Ring Road','Vadodara Railway Colony','Vadodara Textile Mill Area','Vadodara Model Town','Vadodara Sector 1','Vadodara New Township'] },
  rajkot: { name:'Rajkot', hi:'राजकोट', base:163, temp:31, hum:34, wind:8, state:'Gujarat', river:'Local Waterway',
    areas:['Rajkot Textile Mill Area','Rajkot Airport Road','Rajkot University Road','Rajkot Industrial Area','Rajkot Ring Road','Rajkot City Centre','Rajkot New Township','Rajkot Lake View Colony','Rajkot Housing Board Colony','Rajkot Sector 1','Rajkot Cantonment','Rajkot Civil Lines'] },
  chandigarh: { name:'Chandigarh', hi:'चंडीगढ़', base:255, temp:26, hum:46, wind:9, state:'Chandigarh', river:'Sukhna Lake',
    areas:['Chandigarh University Road','Chandigarh Lake View Colony','Chandigarh Cantonment','Chandigarh City Centre','Chandigarh Sector 1','Chandigarh Riverside Colony','Chandigarh Railway Colony','Chandigarh Bus Stand Area','Chandigarh Airport Road','Chandigarh Ring Road','Chandigarh Model Town','Chandigarh Old City'] },
  amritsar: { name:'Amritsar', hi:'अमृतसर', base:200, temp:26, hum:58, wind:7, state:'Punjab', river:'Ravi (nearby)',
    areas:['Amritsar Ring Road','Amritsar Riverside Colony','Amritsar Railway Colony','Amritsar Airport Road','Amritsar Cantonment','Amritsar New Township','Amritsar Model Town','Amritsar City Centre','Amritsar Lake View Colony','Amritsar Industrial Area','Amritsar Bus Stand Area','Amritsar Textile Mill Area'] },
  ludhiana: { name:'Ludhiana', hi:'लुधियाना', base:184, temp:27, hum:55, wind:6, state:'Punjab', river:'Sutlej',
    areas:['Ludhiana New Township','Ludhiana Ring Road','Ludhiana Model Town','Ludhiana Sector 1','Ludhiana Railway Colony','Ludhiana Textile Mill Area','Ludhiana Civil Lines','Ludhiana Lake View Colony','Ludhiana Bus Stand Area','Ludhiana City Centre','Ludhiana Riverside Colony','Ludhiana Central Market'] },
  shimla: { name:'Shimla', hi:'शिमला', base:51, temp:21, hum:70, wind:8, state:'Himachal Pradesh', river:'Local Waterway',
    areas:['Shimla Bus Stand Area','Shimla Railway Colony','Shimla Industrial Area','Shimla Model Town','Shimla Housing Board Colony','Shimla University Road','Shimla City Centre','Shimla Ring Road','Shimla New Township','Shimla Airport Road','Shimla Cantonment','Shimla Lake View Colony'] },
  dharamshala: { name:'Dharamshala', hi:'धर्मशाला', base:40, temp:20, hum:70, wind:10, state:'Himachal Pradesh', river:'Local Waterway',
    areas:['Dharamshala Old City','Dharamshala Cantonment','Dharamshala University Road','Dharamshala Ring Road','Dharamshala Sector 1','Dharamshala Lake View Colony','Dharamshala Model Town','Dharamshala City Centre','Dharamshala Central Market','Dharamshala Airport Road','Dharamshala Housing Board Colony','Dharamshala Civil Lines'] },
  dehradun: { name:'Dehradun', hi:'देहरादून', base:79, temp:17, hum:68, wind:10, state:'Uttarakhand', river:'Song',
    areas:['Dehradun Cantonment','Dehradun Old City','Dehradun Housing Board Colony','Dehradun University Road','Dehradun Textile Mill Area','Dehradun Model Town','Dehradun Ring Road','Dehradun Bus Stand Area','Dehradun Lake View Colony','Dehradun City Centre','Dehradun Civil Lines','Dehradun Central Market'] },
  haridwar: { name:'Haridwar', hi:'हरिद्वार', base:192, temp:25, hum:54, wind:9, state:'Uttarakhand', river:'Ganga',
    areas:['Haridwar Ring Road','Haridwar Housing Board Colony','Haridwar Railway Colony','Haridwar New Township','Haridwar University Road','Haridwar Textile Mill Area','Haridwar Bus Stand Area','Haridwar Cantonment','Haridwar Industrial Area','Haridwar Airport Road','Haridwar Old City','Haridwar Lake View Colony'] },
  srinagar: { name:'Srinagar', hi:'श्रीनगर', base:70, temp:18, hum:71, wind:5, state:'Jammu and Kashmir', river:'Jhelum',
    areas:['Srinagar Riverside Colony','Srinagar City Centre','Srinagar Housing Board Colony','Srinagar Model Town','Srinagar Central Market','Srinagar New Township','Srinagar Airport Road','Srinagar Cantonment','Srinagar Old City','Srinagar Bus Stand Area','Srinagar Sector 1','Srinagar Ring Road'] },
  jammu: { name:'Jammu', hi:'जम्मू', base:191, temp:24, hum:55, wind:9, state:'Jammu and Kashmir', river:'Tawi',
    areas:['Jammu Housing Board Colony','Jammu New Township','Jammu Old City','Jammu University Road','Jammu City Centre','Jammu Model Town','Jammu Ring Road','Jammu Cantonment','Jammu Airport Road','Jammu Sector 1','Jammu Lake View Colony','Jammu Bus Stand Area'] },
  leh: { name:'Leh', hi:'लेह', base:89, temp:20, hum:62, wind:8, state:'Ladakh', river:'Local Waterway',
    areas:['Leh Lake View Colony','Leh Airport Road','Leh Ring Road','Leh Riverside Colony','Leh Bus Stand Area','Leh Old City','Leh New Township','Leh Industrial Area','Leh City Centre','Leh University Road','Leh Central Market','Leh Cantonment'] },
  itanagar: { name:'Itanagar', hi:'ईटानगर', base:48, temp:23, hum:84, wind:7, state:'Arunachal Pradesh', river:'Local Waterway',
    areas:['Itanagar Railway Colony','Itanagar Textile Mill Area','Itanagar Airport Road','Itanagar Ring Road','Itanagar Housing Board Colony','Itanagar Industrial Area','Itanagar New Township','Itanagar Bus Stand Area','Itanagar Civil Lines','Itanagar Model Town','Itanagar Lake View Colony','Itanagar Cantonment'] },
  imphal: { name:'Imphal', hi:'इंफाल', base:80, temp:21, hum:73, wind:8, state:'Manipur', river:'Local Waterway',
    areas:['Imphal Bus Stand Area','Imphal Industrial Area','Imphal University Road','Imphal City Centre','Imphal Cantonment','Imphal Civil Lines','Imphal Old City','Imphal Housing Board Colony','Imphal New Township','Imphal Sector 1','Imphal Airport Road','Imphal Ring Road'] },
  shillong: { name:'Shillong', hi:'शिलांग', base:79, temp:27, hum:85, wind:7, state:'Meghalaya', river:'Local Waterway',
    areas:['Shillong New Township','Shillong Riverside Colony','Shillong Cantonment','Shillong Bus Stand Area','Shillong Railway Colony','Shillong Model Town','Shillong Airport Road','Shillong Housing Board Colony','Shillong Old City','Shillong Civil Lines','Shillong Ring Road','Shillong Lake View Colony'] },
  aizawl: { name:'Aizawl', hi:'आइज़ोल', base:55, temp:24, hum:80, wind:8, state:'Mizoram', river:'Local Waterway',
    areas:['Aizawl City Centre','Aizawl Model Town','Aizawl Lake View Colony','Aizawl Airport Road','Aizawl Railway Colony','Aizawl Riverside Colony','Aizawl University Road','Aizawl New Township','Aizawl Cantonment','Aizawl Central Market','Aizawl Bus Stand Area','Aizawl Civil Lines'] },
  kohima: { name:'Kohima', hi:'कोहिमा', base:43, temp:22, hum:72, wind:8, state:'Nagaland', river:'Local Waterway',
    areas:['Kohima Civil Lines','Kohima Central Market','Kohima Model Town','Kohima Bus Stand Area','Kohima Riverside Colony','Kohima Ring Road','Kohima Old City','Kohima Airport Road','Kohima Textile Mill Area','Kohima University Road','Kohima Cantonment','Kohima City Centre'] },
  agartala: { name:'Agartala', hi:'अगरतला', base:72, temp:27, hum:76, wind:8, state:'Tripura', river:'Local Waterway',
    areas:['Agartala Airport Road','Agartala Cantonment','Agartala New Township','Agartala University Road','Agartala Old City','Agartala Riverside Colony','Agartala Railway Colony','Agartala Industrial Area','Agartala Textile Mill Area','Agartala Ring Road','Agartala Civil Lines','Agartala Sector 1'] },
  gangtok: { name:'Gangtok', hi:'गंगटोक', base:52, temp:17, hum:68, wind:9, state:'Sikkim', river:'Local Waterway',
    areas:['Gangtok Industrial Area','Gangtok Cantonment','Gangtok Central Market','Gangtok Bus Stand Area','Gangtok Ring Road','Gangtok Airport Road','Gangtok University Road','Gangtok Sector 1','Gangtok Housing Board Colony','Gangtok Civil Lines','Gangtok New Township','Gangtok Railway Colony'] },
  faridabad: { name:'Faridabad', hi:'फरीदाबाद', base:237, temp:26, hum:46, wind:6, state:'Haryana', river:'Local Waterway',
    areas:['Faridabad Central Market','Faridabad Riverside Colony','Faridabad Cantonment','Faridabad Model Town','Faridabad University Road','Faridabad New Township','Faridabad Sector 1','Faridabad Old City','Faridabad Bus Stand Area','Faridabad City Centre','Faridabad Industrial Area','Faridabad Civil Lines'] },
  gurugram: { name:'Gurugram', hi:'गुरुग्राम', base:180, temp:26, hum:46, wind:7, state:'Haryana', river:'Local Waterway',
    areas:['Gurugram Riverside Colony','Gurugram Civil Lines','Gurugram University Road','Gurugram Airport Road','Gurugram Housing Board Colony','Gurugram City Centre','Gurugram Railway Colony','Gurugram Lake View Colony','Gurugram Old City','Gurugram New Township','Gurugram Cantonment','Gurugram Model Town'] },
  rohtak: { name:'Rohtak', hi:'रोहतक', base:221, temp:26, hum:45, wind:9, state:'Haryana', river:'Local Waterway',
    areas:['Rohtak Ring Road','Rohtak Railway Colony','Rohtak Industrial Area','Rohtak Central Market','Rohtak Textile Mill Area','Rohtak Riverside Colony','Rohtak Sector 1','Rohtak Bus Stand Area','Rohtak Old City','Rohtak University Road','Rohtak City Centre','Rohtak Cantonment'] },
  jodhpur: { name:'Jodhpur', hi:'जोधपुर', base:177, temp:34, hum:41, wind:10, state:'Rajasthan', river:'Jojari',
    areas:['Jodhpur City Centre','Jodhpur University Road','Jodhpur Sector 1','Jodhpur Model Town','Jodhpur Civil Lines','Jodhpur Housing Board Colony','Jodhpur Bus Stand Area','Jodhpur Airport Road','Jodhpur Industrial Area','Jodhpur Central Market','Jodhpur Ring Road','Jodhpur Riverside Colony'] },
  udaipur: { name:'Udaipur', hi:'उदयपुर', base:214, temp:35, hum:40, wind:12, state:'Rajasthan', river:'Ahar',
    areas:['Udaipur Riverside Colony','Udaipur Model Town','Udaipur City Centre','Udaipur Housing Board Colony','Udaipur Railway Colony','Udaipur Civil Lines','Udaipur Airport Road','Udaipur Industrial Area','Udaipur University Road','Udaipur Cantonment','Udaipur Textile Mill Area','Udaipur Bus Stand Area'] },
  kota: { name:'Kota', hi:'कोटा', base:207, temp:33, hum:31, wind:13, state:'Rajasthan', river:'Chambal',
    areas:['Kota City Centre','Kota Ring Road','Kota Lake View Colony','Kota Textile Mill Area','Kota Bus Stand Area','Kota Railway Colony','Kota Model Town','Kota Sector 1','Kota Old City','Kota Central Market','Kota Civil Lines','Kota Housing Board Colony'] },
  bikaner: { name:'Bikaner', hi:'बीकानेर', base:205, temp:33, hum:32, wind:11, state:'Rajasthan', river:'Local Waterway',
    areas:['Bikaner Sector 1','Bikaner Cantonment','Bikaner Lake View Colony','Bikaner Model Town','Bikaner City Centre','Bikaner Industrial Area','Bikaner Ring Road','Bikaner Housing Board Colony','Bikaner Civil Lines','Bikaner Airport Road','Bikaner University Road','Bikaner Riverside Colony'] },
  agra: { name:'Agra', hi:'आगरा', base:226, temp:28, hum:51, wind:9, state:'Uttar Pradesh', river:'Yamuna',
    areas:['Agra Railway Colony','Agra Old City','Agra Sector 1','Agra Model Town','Agra Lake View Colony','Agra Bus Stand Area','Agra Textile Mill Area','Agra Riverside Colony','Agra Airport Road','Agra Industrial Area','Agra Cantonment','Agra New Township'] },
  varanasi: { name:'Varanasi', hi:'वाराणसी', base:249, temp:27, hum:55, wind:7, state:'Uttar Pradesh', river:'Ganga',
    areas:['Varanasi Central Market','Varanasi Cantonment','Varanasi Old City','Varanasi Civil Lines','Varanasi Housing Board Colony','Varanasi Railway Colony','Varanasi New Township','Varanasi Textile Mill Area','Varanasi Ring Road','Varanasi Bus Stand Area','Varanasi Riverside Colony','Varanasi University Road'] },
  meerut: { name:'Meerut', hi:'मेरठ', base:202, temp:27, hum:56, wind:7, state:'Uttar Pradesh', river:'Kali',
    areas:['Meerut Bus Stand Area','Meerut Riverside Colony','Meerut Industrial Area','Meerut Lake View Colony','Meerut Textile Mill Area','Meerut Airport Road','Meerut Civil Lines','Meerut Housing Board Colony','Meerut Central Market','Meerut Old City','Meerut Model Town','Meerut University Road'] },
  prayagraj: { name:'Prayagraj', hi:'प्रयागराज', base:204, temp:25, hum:51, wind:6, state:'Uttar Pradesh', river:'Ganga-Yamuna Confluence',
    areas:['Prayagraj Riverside Colony','Prayagraj University Road','Prayagraj Model Town','Prayagraj Textile Mill Area','Prayagraj Ring Road','Prayagraj Airport Road','Prayagraj Cantonment','Prayagraj Bus Stand Area','Prayagraj Lake View Colony','Prayagraj Industrial Area','Prayagraj Civil Lines','Prayagraj Sector 1'] },
  ghaziabad: { name:'Ghaziabad', hi:'गाज़ियाबाद', base:239, temp:26, hum:57, wind:7, state:'Uttar Pradesh', river:'Hindon',
    areas:['Ghaziabad Housing Board Colony','Ghaziabad Ring Road','Ghaziabad Riverside Colony','Ghaziabad Lake View Colony','Ghaziabad Bus Stand Area','Ghaziabad Railway Colony','Ghaziabad City Centre','Ghaziabad Sector 1','Ghaziabad New Township','Ghaziabad Industrial Area','Ghaziabad Model Town','Ghaziabad Textile Mill Area'] },
  noida: { name:'Noida', hi:'नोएडा', base:225, temp:27, hum:48, wind:9, state:'Uttar Pradesh', river:'Local Waterway',
    areas:['Noida Old City','Noida Textile Mill Area','Noida New Township','Noida Sector 1','Noida University Road','Noida City Centre','Noida Railway Colony','Noida Cantonment','Noida Civil Lines','Noida Model Town','Noida Riverside Colony','Noida Industrial Area'] },
  bareilly: { name:'Bareilly', hi:'बरेली', base:194, temp:25, hum:45, wind:6, state:'Uttar Pradesh', river:'Ramganga',
    areas:['Bareilly University Road','Bareilly Railway Colony','Bareilly Civil Lines','Bareilly Model Town','Bareilly Riverside Colony','Bareilly Industrial Area','Bareilly Airport Road','Bareilly Cantonment','Bareilly Central Market','Bareilly Sector 1','Bareilly Lake View Colony','Bareilly Ring Road'] },
  gorakhpur: { name:'Gorakhpur', hi:'गोरखपुर', base:209, temp:24, hum:48, wind:8, state:'Uttar Pradesh', river:'Rapti',
    areas:['Gorakhpur Civil Lines','Gorakhpur Riverside Colony','Gorakhpur Housing Board Colony','Gorakhpur Ring Road','Gorakhpur Cantonment','Gorakhpur Central Market','Gorakhpur Railway Colony','Gorakhpur Model Town','Gorakhpur New Township','Gorakhpur City Centre','Gorakhpur Sector 1','Gorakhpur Industrial Area'] },
  siliguri: { name:'Siliguri', hi:'सिलीगुड़ी', base:207, temp:31, hum:63, wind:7, state:'West Bengal', river:'Mahananda',
    areas:['Siliguri Ring Road','Siliguri Lake View Colony','Siliguri New Township','Siliguri Bus Stand Area','Siliguri Central Market','Siliguri Airport Road','Siliguri Riverside Colony','Siliguri Sector 1','Siliguri Cantonment','Siliguri Railway Colony','Siliguri Old City','Siliguri Civil Lines'] },
  durgapur: { name:'Durgapur', hi:'दुर्गापुर', base:179, temp:30, hum:71, wind:8, state:'West Bengal', river:'Damodar',
    areas:['Durgapur Sector 1','Durgapur New Township','Durgapur Old City','Durgapur Cantonment','Durgapur University Road','Durgapur Model Town','Durgapur Textile Mill Area','Durgapur Housing Board Colony','Durgapur Railway Colony','Durgapur Riverside Colony','Durgapur Industrial Area','Durgapur City Centre'] },
  asansol: { name:'Asansol', hi:'आसनसोल', base:153, temp:29, hum:62, wind:10, state:'West Bengal', river:'Damodar',
    areas:['Asansol Riverside Colony','Asansol Housing Board Colony','Asansol Bus Stand Area','Asansol Model Town','Asansol Industrial Area','Asansol Cantonment','Asansol City Centre','Asansol Old City','Asansol Railway Colony','Asansol Ring Road','Asansol Civil Lines','Asansol Airport Road'] },
  howrah: { name:'Howrah', hi:'हावड़ा', base:161, temp:27, hum:65, wind:9, state:'West Bengal', river:'Hooghly',
    areas:['Howrah Old City','Howrah Civil Lines','Howrah Riverside Colony','Howrah Industrial Area','Howrah Bus Stand Area','Howrah University Road','Howrah Ring Road','Howrah Central Market','Howrah Textile Mill Area','Howrah Lake View Colony','Howrah New Township','Howrah Airport Road'] },
  mysuru: { name:'Mysuru', hi:'मैसूरु', base:149, temp:25, hum:46, wind:9, state:'Karnataka', river:'Local Waterway',
    areas:['Mysuru Riverside Colony','Mysuru Lake View Colony','Mysuru Old City','Mysuru Sector 1','Mysuru Civil Lines','Mysuru Bus Stand Area','Mysuru New Township','Mysuru Textile Mill Area','Mysuru Central Market','Mysuru City Centre','Mysuru Ring Road','Mysuru Industrial Area'] },
  hubballi: { name:'Hubballi', hi:'हुब्बल्ली', base:179, temp:26, hum:45, wind:9, state:'Karnataka', river:'Local Waterway',
    areas:['Hubballi Old City','Hubballi Lake View Colony','Hubballi Railway Colony','Hubballi City Centre','Hubballi Cantonment','Hubballi Airport Road','Hubballi Industrial Area','Hubballi Bus Stand Area','Hubballi New Township','Hubballi Sector 1','Hubballi Riverside Colony','Hubballi Housing Board Colony'] },
  mangaluru: { name:'Mangaluru', hi:'मंगलुरु', base:95, temp:30, hum:73, wind:13, state:'Karnataka', river:'Local Waterway',
    areas:['Mangaluru Riverside Colony','Mangaluru Sector 1','Mangaluru Model Town','Mangaluru Ring Road','Mangaluru City Centre','Mangaluru Old City','Mangaluru Airport Road','Mangaluru Housing Board Colony','Mangaluru University Road','Mangaluru Central Market','Mangaluru Textile Mill Area','Mangaluru Bus Stand Area'] },
  belagavi: { name:'Belagavi', hi:'बेळगावी', base:132, temp:26, hum:53, wind:7, state:'Karnataka', river:'Local Waterway',
    areas:['Belagavi Railway Colony','Belagavi City Centre','Belagavi Sector 1','Belagavi Textile Mill Area','Belagavi University Road','Belagavi Riverside Colony','Belagavi Model Town','Belagavi Industrial Area','Belagavi Housing Board Colony','Belagavi Cantonment','Belagavi Airport Road','Belagavi Lake View Colony'] },
  nashik: { name:'Nashik', hi:'नासिक', base:169, temp:30, hum:53, wind:7, state:'Maharashtra', river:'Godavari',
    areas:['Nashik Industrial Area','Nashik Bus Stand Area','Nashik Railway Colony','Nashik Airport Road','Nashik Lake View Colony','Nashik Cantonment','Nashik Textile Mill Area','Nashik Central Market','Nashik Sector 1','Nashik Model Town','Nashik Civil Lines','Nashik Ring Road'] },
  thane: { name:'Thane', hi:'ठाणे', base:109, temp:28, hum:65, wind:15, state:'Maharashtra', river:'Ulhas',
    areas:['Thane Housing Board Colony','Thane Lake View Colony','Thane Cantonment','Thane Central Market','Thane Riverside Colony','Thane Civil Lines','Thane Bus Stand Area','Thane City Centre','Thane Industrial Area','Thane Ring Road','Thane Old City','Thane Sector 1'] },
  aurangabad: { name:'Aurangabad', hi:'औरंगाबाद', base:159, temp:25, hum:54, wind:8, state:'Maharashtra', river:'Kham',
    areas:['Aurangabad Housing Board Colony','Aurangabad City Centre','Aurangabad Old City','Aurangabad New Township','Aurangabad Sector 1','Aurangabad Bus Stand Area','Aurangabad Cantonment','Aurangabad Model Town','Aurangabad Civil Lines','Aurangabad Ring Road','Aurangabad Railway Colony','Aurangabad University Road'] },
  solapur: { name:'Solapur', hi:'सोलापुर', base:163, temp:25, hum:51, wind:10, state:'Maharashtra', river:'Bhima',
    areas:['Solapur New Township','Solapur Sector 1','Solapur Model Town','Solapur Central Market','Solapur Industrial Area','Solapur Ring Road','Solapur Civil Lines','Solapur Textile Mill Area','Solapur Housing Board Colony','Solapur Lake View Colony','Solapur Airport Road','Solapur Riverside Colony'] },
  jabalpur: { name:'Jabalpur', hi:'जबलपुर', base:123, temp:29, hum:55, wind:7, state:'Madhya Pradesh', river:'Narmada',
    areas:['Jabalpur Riverside Colony','Jabalpur Housing Board Colony','Jabalpur Ring Road','Jabalpur Civil Lines','Jabalpur Textile Mill Area','Jabalpur University Road','Jabalpur City Centre','Jabalpur Industrial Area','Jabalpur Model Town','Jabalpur Railway Colony','Jabalpur Bus Stand Area','Jabalpur New Township'] },
  gwalior: { name:'Gwalior', hi:'ग्वालियर', base:188, temp:26, hum:47, wind:6, state:'Madhya Pradesh', river:'Swarnrekha',
    areas:['Gwalior Sector 1','Gwalior Cantonment','Gwalior Civil Lines','Gwalior Airport Road','Gwalior Lake View Colony','Gwalior University Road','Gwalior Riverside Colony','Gwalior Housing Board Colony','Gwalior City Centre','Gwalior Bus Stand Area','Gwalior Railway Colony','Gwalior Industrial Area'] },
  ujjain: { name:'Ujjain', hi:'उज्जैन', base:116, temp:28, hum:48, wind:11, state:'Madhya Pradesh', river:'Kshipra',
    areas:['Ujjain Model Town','Ujjain Textile Mill Area','Ujjain Bus Stand Area','Ujjain Civil Lines','Ujjain Old City','Ujjain New Township','Ujjain Airport Road','Ujjain University Road','Ujjain City Centre','Ujjain Ring Road','Ujjain Railway Colony','Ujjain Sector 1'] },
  bilaspur: { name:'Bilaspur', hi:'बिलासपुर', base:163, temp:30, hum:50, wind:10, state:'Chhattisgarh', river:'Arpa',
    areas:['Bilaspur Central Market','Bilaspur Model Town','Bilaspur Cantonment','Bilaspur Industrial Area','Bilaspur Lake View Colony','Bilaspur Textile Mill Area','Bilaspur Railway Colony','Bilaspur Old City','Bilaspur Sector 1','Bilaspur University Road','Bilaspur New Township','Bilaspur Bus Stand Area'] },
  puducherry: { name:'Puducherry', hi:'पुडुचेरी', base:107, temp:31, hum:66, wind:10, state:'Puducherry', river:'Local Waterway',
    areas:['Puducherry Model Town','Puducherry Sector 1','Puducherry Lake View Colony','Puducherry Old City','Puducherry Textile Mill Area','Puducherry Civil Lines','Puducherry Housing Board Colony','Puducherry University Road','Puducherry City Centre','Puducherry Airport Road','Puducherry New Township','Puducherry Central Market'] },
  portblair: { name:'Port Blair', hi:'पोर्ट ब्लेयर', base:54, temp:30, hum:77, wind:12, state:'Andaman and Nicobar Islands', river:'Local Waterway',
    areas:['Port Blair Housing Board Colony','Port Blair Civil Lines','Port Blair City Centre','Port Blair New Township','Port Blair Railway Colony','Port Blair Sector 1','Port Blair Ring Road','Port Blair Lake View Colony','Port Blair University Road','Port Blair Bus Stand Area','Port Blair Textile Mill Area','Port Blair Industrial Area'] },
  kavaratti: { name:'Kavaratti', hi:'कवरत्ती', base:41, temp:28, hum:84, wind:14, state:'Lakshadweep', river:'Local Waterway',
    areas:['Kavaratti Ring Road','Kavaratti Airport Road','Kavaratti Sector 1','Kavaratti Industrial Area','Kavaratti University Road','Kavaratti Textile Mill Area','Kavaratti Bus Stand Area','Kavaratti Railway Colony','Kavaratti Civil Lines','Kavaratti Cantonment','Kavaratti City Centre','Kavaratti Old City'] },
  daman: { name:'Daman', hi:'दमन', base:114, temp:27, hum:71, wind:10, state:'Dadra and Nagar Haveli and Daman and Diu', river:'Local Waterway',
    areas:['Daman Civil Lines','Daman Model Town','Daman Riverside Colony','Daman Lake View Colony','Daman Bus Stand Area','Daman Cantonment','Daman New Township','Daman Industrial Area','Daman Central Market','Daman University Road','Daman Old City','Daman City Centre'] },
  tiruchirappalli: { name:'Tiruchirappalli', hi:'तिरुचिरापल्ली', base:98, temp:32, hum:70, wind:11, state:'Tamil Nadu', river:'Kaveri',
    areas:['Tiruchirappalli Railway Colony','Tiruchirappalli Central Market','Tiruchirappalli New Township','Tiruchirappalli Housing Board Colony','Tiruchirappalli Model Town','Tiruchirappalli University Road','Tiruchirappalli Riverside Colony','Tiruchirappalli Old City','Tiruchirappalli Bus Stand Area','Tiruchirappalli Industrial Area','Tiruchirappalli Airport Road','Tiruchirappalli Cantonment'] },
  salem: { name:'Salem', hi:'सेलम', base:151, temp:26, hum:55, wind:9, state:'Tamil Nadu', river:'Local Waterway',
    areas:['Salem New Township','Salem Cantonment','Salem Old City','Salem Housing Board Colony','Salem University Road','Salem Bus Stand Area','Salem Civil Lines','Salem Airport Road','Salem Ring Road','Salem City Centre','Salem Model Town','Salem Railway Colony'] },
  thrissur: { name:'Thrissur', hi:'त्रिशूर', base:122, temp:31, hum:75, wind:12, state:'Kerala', river:'Local Waterway',
    areas:['Thrissur Lake View Colony','Thrissur University Road','Thrissur Model Town','Thrissur Textile Mill Area','Thrissur Central Market','Thrissur Railway Colony','Thrissur Industrial Area','Thrissur Civil Lines','Thrissur New Township','Thrissur Airport Road','Thrissur Housing Board Colony','Thrissur Sector 1'] },
  warangal: { name:'Warangal', hi:'वारंगल', base:179, temp:26, hum:57, wind:7, state:'Telangana', river:'Bhadrakali Lake',
    areas:['Warangal Textile Mill Area','Warangal Old City','Warangal University Road','Warangal City Centre','Warangal Riverside Colony','Warangal Sector 1','Warangal Civil Lines','Warangal Bus Stand Area','Warangal Cantonment','Warangal Housing Board Colony','Warangal Lake View Colony','Warangal Ring Road'] },
  rourkela: { name:'Rourkela', hi:'राउरकेला', base:167, temp:28, hum:62, wind:9, state:'Odisha', river:'Koel',
    areas:['Rourkela Industrial Area','Rourkela Textile Mill Area','Rourkela Bus Stand Area','Rourkela New Township','Rourkela Ring Road','Rourkela Airport Road','Rourkela University Road','Rourkela Cantonment','Rourkela Railway Colony','Rourkela Central Market','Rourkela City Centre','Rourkela Lake View Colony'] },
  muzaffarpur: { name:'Muzaffarpur', hi:'मुजफ्फरपुर', base:230, temp:29, hum:46, wind:7, state:'Bihar', river:'Budhi Gandak',
    areas:['Muzaffarpur Airport Road','Muzaffarpur Riverside Colony','Muzaffarpur University Road','Muzaffarpur Railway Colony','Muzaffarpur Housing Board Colony','Muzaffarpur Cantonment','Muzaffarpur Central Market','Muzaffarpur Civil Lines','Muzaffarpur Old City','Muzaffarpur Bus Stand Area','Muzaffarpur Industrial Area','Muzaffarpur New Township'] },
  gaya: { name:'Gaya', hi:'गया', base:246, temp:26, hum:53, wind:6, state:'Bihar', river:'Falgu',
    areas:['Gaya Airport Road','Gaya Old City','Gaya Lake View Colony','Gaya Ring Road','Gaya New Township','Gaya Central Market','Gaya City Centre','Gaya Sector 1','Gaya Cantonment','Gaya Textile Mill Area','Gaya Housing Board Colony','Gaya Industrial Area'] },
  bhagalpur: { name:'Bhagalpur', hi:'भागलपुर', base:200, temp:25, hum:57, wind:9, state:'Bihar', river:'Ganga',
    areas:['Bhagalpur Railway Colony','Bhagalpur Textile Mill Area','Bhagalpur Sector 1','Bhagalpur Industrial Area','Bhagalpur New Township','Bhagalpur Old City','Bhagalpur Airport Road','Bhagalpur Civil Lines','Bhagalpur City Centre','Bhagalpur Central Market','Bhagalpur Ring Road','Bhagalpur University Road'] },
};
const CITY_KEYS = Object.keys(CITY_DEFS);
const cityName = k => (S.lang === 'hi' ? CITY_DEFS[k].hi : CITY_DEFS[k].name);

const TYPES = ['Industrial','Agricultural','Dust','Vehicle','Garbage','Smoke','Unknown'];
const SEVS  = ['Low','Medium','High','Critical'];
const STATS = ['New','Investigating','Verified','Resolved'];
const DIRS  = ['N','NE','E','SE','S','SW','W','NW'];
const SOURCE_OF_TYPE = {
  Industrial:'Industrial emission', Agricultural:'Crop residue burning', Dust:'Construction and road dust',
  Vehicle:'Traffic congestion', Garbage:'Open waste burning', Smoke:'Unidentified combustion', Unknown:'Mixed / unresolved'
};
const ACTIONS = [
  'Deploy mobile monitoring unit and notify the local environmental response team.',
  'Issue a stop-work notice to construction sites within 2 km and start water sprinkling.',
  'Route heavy vehicles away from the corridor during evening peak hours.',
  'Send a field inspection team to verify stack emissions at nearby units.',
  'Coordinate with the municipal ward office to stop open waste burning.',
  'Advise schools within 1 km to move outdoor activity indoors for 24 hours.'
];
const INFRA_TYPES = [
  {k:'Hospital',  hi:'अस्पताल',        icon:'infra'},
  {k:'School',    hi:'विद्यालय',       icon:'people'},
  {k:'Road',      hi:'सड़क गलियारा',   icon:'compare'},
  {k:'Industrial',hi:'औद्योगिक क्षेत्र', icon:'target'},
  {k:'Power',     hi:'विद्युत अवसंरचना', icon:'ai'},
  {k:'Shelter',   hi:'आपातकालीन आश्रय', icon:'infra'}
];
const INFRA_NAMES = {
  Hospital:['District General Hospital','Community Health Centre','Maternity & Child Hospital'],
  School:['Municipal Primary School','Government Girls School','Senior Secondary School'],
  Road:['Ring Road Corridor','Bypass Freight Route','Station Approach Road'],
  Industrial:['Industrial Estate Phase I','Foundry Cluster','Textile Processing Zone'],
  Power:['Substation 220kV','Thermal Backup Station','Grid Control Centre'],
  Shelter:['Night Shelter Complex','Relief Camp Ground','Community Hall Shelter']
};
const RECIPIENTS = ['Municipal Authority','Pollution Control Board','Disaster Management','Field Response Team'];
const TEAMS = ['Field Response Team A','Field Response Team B','Mobile Monitoring Unit','Ward Sanitation Squad'];

/* pollutant set derived from AQI so the numbers stay internally consistent */
function pollutantsFor(aqi, r){
  const j = (m) => +(m * (0.9 + r()*0.22)).toFixed(1);
  return {
    pm25: Math.round(j(aqi * 0.42)),
    pm10: Math.round(j(aqi * 0.78)),
    no2:  Math.round(j(aqi * 0.19)),
    so2:  Math.round(j(aqi * 0.08)),
    co:   +(j(aqi * 0.006)).toFixed(1),
    o3:   Math.round(j(aqi * 0.14))
  };
}

