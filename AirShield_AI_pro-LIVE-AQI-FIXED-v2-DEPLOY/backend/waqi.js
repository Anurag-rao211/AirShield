'use strict';

const BASE = 'https://api.waqi.info';

function token(){
  const value = String(process.env.WAQI_TOKEN || '').trim();
  if (!value) throw new Error('WAQI_TOKEN is not configured in the deployment environment');
  return value;
}

async function waqiJson(path, params={}){
  const url = new URL(BASE + path);
  url.searchParams.set('token', token());
  for (const [k,v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try{
    const response = await fetch(url, {headers:{Accept:'application/json'}, cache:'no-store', signal:controller.signal});
    const raw = await response.text();
    let json;
    try { json = JSON.parse(raw); } catch { throw new Error(`WAQI returned invalid JSON (HTTP ${response.status})`); }
    if (!response.ok || json.status !== 'ok') throw new Error(json.data || json.reason || `WAQI HTTP ${response.status}`);
    return json.data;
  } finally { clearTimeout(timer); }
}

function isIndiaStation(item){
  const name = String(item?.station?.name || '').toLowerCase();
  const geo = item?.station?.geo;
  const lat = Number(geo?.[0]), lon = Number(geo?.[1]);
  return name.includes('india') || (Number.isFinite(lat) && Number.isFinite(lon) && lat >= 6 && lat <= 37.5 && lon >= 68 && lon <= 97.5);
}

async function searchIndia(keyword){
  const q = String(keyword || '').trim();
  if (!q) throw new Error('Location is required');
  const data = await waqiJson('/v2/search/', {keyword:q});
  return (Array.isArray(data) ? data : []).filter(isIndiaStation);
}

async function feedByUid(uid){
  const raw = String(uid || '').trim();
  if (!raw) throw new Error('Missing WAQI station ID');
  const path = raw.startsWith('@') ? `/feed/${encodeURIComponent(raw)}/` : `/feed/@${encodeURIComponent(raw)}/`;
  return waqiJson(path);
}

function normalize(data){
  const num = k => Number.isFinite(Number(data?.iaqi?.[k]?.v)) ? Number(data.iaqi[k].v) : null;
  const aqi = Number(data?.aqi);
  if (!Number.isFinite(aqi)) throw new Error('WAQI returned no numeric AQI');
  return {
    aqi,
    iaqi:{pm25:num('pm25'),pm10:num('pm10'),no2:num('no2'),so2:num('so2'),co:num('co'),o3:num('o3')},
    weather:{temp:num('t'),hum:num('h'),wind:num('w'),dir:num('wd')},
    timestamp:data?.time?.iso || new Date().toISOString(),
    station:{name:data?.city?.name || 'WAQI station',url:data?.city?.url || null,geo:Array.isArray(data?.city?.geo)?data.city.geo:null,uid:data?.idx || null},
    source:'WAQI'
  };
}

async function getAQIByLocation(location, state='', uid=''){
  if (uid && /^(?:\d{1,12}|[A-Za-z]\d{1,20}|@\d{1,12})$/.test(uid)) {
    try {
      return normalize(await feedByUid(uid));
    } catch (e) {
      console.warn(`[WAQI] UID ${uid} fetch failed, falling back to location search: ${e.message}`);
    }
  }
  const locTrim = String(location || '').trim();
  const stateTrim = String(state || '').trim();
  const queries = [
    locTrim,
    locTrim ? `${locTrim}, India` : '',
    [locTrim, stateTrim].filter(Boolean).join(', '),
    [locTrim, stateTrim, 'India'].filter(Boolean).join(', ')
  ].filter(Boolean);

  let results = [];
  for (const q of queries) {
    try {
      const r = await searchIndia(q);
      if (r && r.length) {
        results = r;
        const locLower = locTrim.toLowerCase();
        if (r.some(x => String(x.station?.name || '').toLowerCase().includes(locLower))) break;
      }
    } catch(e) {}
  }

  if (!results.length) throw new Error(`No WAQI monitoring station found for ${location}${state ? ', '+state : ''}`);

  const locLower = locTrim.toLowerCase();
  const matchedLoc = results.filter(x => String(x.station?.name || '').toLowerCase().includes(locLower));
  const candidates = matchedLoc.length ? matchedLoc : results;

  let lastError = null;
  for (const candidate of candidates) {
    try {
      const raw = await feedByUid(candidate.uid);
      return normalize(raw);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error(`No active WAQI monitoring station found with live data for ${location}`);
}

module.exports = {getAQIByLocation, searchIndia, feedByUid};
