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
  // WAQI station search normally returns numeric UIDs; city/station IDs such as A79471 are also valid feed identifiers.
  const path = /^\d+$/.test(raw) ? `/feed/@${encodeURIComponent(raw)}/` : `/feed/${encodeURIComponent(raw)}/`;
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
  if (uid && /^(?:\d{1,12}|[A-Za-z]\d{1,20})$/.test(uid)) {
    return normalize(await feedByUid(uid));
  }
  const query = [location, state, 'India'].filter(Boolean).join(', ');
  let results = await searchIndia(query);
  if (!results.length && state) results = await searchIndia(`${location}, India`);
  if (!results.length) throw new Error(`No WAQI monitoring station found for ${location}${state ? ', '+state : ''}`);
  const chosen = results.find(x => String(x.aqi).toLowerCase() !== 'unknown') || results[0];
  return normalize(await feedByUid(chosen.uid));
}

module.exports = {getAQIByLocation, searchIndia};
