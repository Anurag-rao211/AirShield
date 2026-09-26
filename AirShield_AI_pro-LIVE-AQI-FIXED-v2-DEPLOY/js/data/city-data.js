const CACHE = {};
function cityData(key){
  if (CACHE[key]) return CACHE[key];
  const def = CITY_DEFS[key], r = rngFrom('airshield-' + key), now = Date.now();

  /* ---- sensors: laid out on a schematic 1000 x 640 canvas ---- */
  const sensors = def.areas.map((area, i) => {
    const ang = (i / def.areas.length) * Math.PI * 2 + r() * 0.5;
    const rad = 120 + r() * 210;
    const aqi = clamp(Math.round(def.base + between(r, -70, 95)), 28, 460);
    return {
      id:'AS-SEN-' + key.slice(0,2).toUpperCase() + pad(i+1),
      type:'sensor', name:area, x: 500 + Math.cos(ang)*rad*1.35, y: 320 + Math.sin(ang)*rad*0.78,
      aqi, ...pollutantsFor(aqi, r),
      temp: def.temp + between(r,-2,3), hum: def.hum + between(r,-8,9),
      wind: +(def.wind + between(r,-3,4,1)).toFixed(1), dir: pick(r, DIRS),
      online: r() > 0.06, ts: now - Math.round(r()*9)*60000,
      risk: (aqi>300?'Critical':aqi>200?'High':aqi>120?'Medium':'Low'), status:'Reporting'
    };
  });

  /* ---- industrial zones and traffic corridors ---- */
  const zones = [0,1,2].map(i => ({
    id:'ZN-'+key.toUpperCase()+'-'+(i+1), name: def.areas[(i*4+1) % def.areas.length] + ' zone',
    x: between(r,180,820), y: between(r,140,500), w: between(r,110,190), h: between(r,70,130)
  }));
  const roads = [0,1,2,3].map(i => ({
    id:'RD-'+(i+1),
    pts:[[between(r,0,180), between(r,80,560)], [between(r,320,520), between(r,180,460)],
         [between(r,560,760), between(r,120,520)], [between(r,880,1000), between(r,90,580)]]
  }));

  /* ---- hotspots ---- */
  const hCount = 4 + Math.floor(r()*3);
  const hotspots = Array.from({length:hCount}, (_,i) => {
    const type = pick(r, TYPES.slice(0,6));
    const aqi = clamp(Math.round(def.base + between(r, 20, 150)), 90, 480);
    const conf = between(r, 72, 96);
    const s = sensors[(i*2+1) % sensors.length];
    return {
      id:'HS-' + pad(i+1), type:'hotspot', idx:i+1, name:s.name, area:s.name, kind:type,
      x: s.x + between(r,-40,40), y: s.y + between(r,-30,30),
      aqi, ...pollutantsFor(aqi, r),
      risk: aqi>320?'Critical':aqi>240?'High':aqi>160?'Medium':'Low',
      confidence: conf, source: SOURCE_OF_TYPE[type],
      dir: pick(r, DIRS), temp: def.temp + between(r,-2,3), hum: def.hum + between(r,-9,9),
      wind: +(def.wind + between(r,-2,5,1)).toFixed(1),
      people: between(r, 12, 240) * 1000,
      infra: [pick(r,['2 hospitals','1 hospital','3 clinics']), pick(r,['6 schools','11 schools','4 schools']), pick(r,['1 bus depot','a rail yard','a freight corridor'])].join(', '),
      action: ACTIONS[i % ACTIONS.length],
      ts: now - Math.round(r()*40)*60000, status:'Active'
    };
  }).sort((a,b) => b.aqi - a.aqi).map((h,i) => ({...h, idx:i+1, id:'HS-'+pad(i+1)}));

  /* ---- seeded citizen reports ---- */
  const rCount = 16 + Math.floor(r()*8);
  const reports = Array.from({length:rCount}, (_,i) => {
    const s = sensors[Math.floor(r()*sensors.length)];
    const type = pick(r, TYPES);
    const hoursBack = Math.floor(r()*96);
    return {
      id:'AS-2026-' + (10000 + Math.floor(r()*89999)),
      city:key, type:'report', kind:type, location:s.name,
      x: s.x + between(r,-55,55), y: s.y + between(r,-40,40),
      severity: pick(r, SEVS), status: pick(r, STATS),
      confidence: between(r, 54, 97),
      desc: pick(r, [
        'Thick haze hanging over the area since early morning.',
        'Strong burning smell, visibility down to a few hundred metres.',
        'Dust cloud from an unbarricaded construction site.',
        'Heavy black smoke from a chimney near the residential block.',
        'Waste being burned in the open at the corner plot.',
        'Idling trucks queued along the road for over an hour.'
      ]),
      reporter: pick(r, ['Resident','Anonymous','Ward volunteer','Local shopkeeper','Teacher']),
      ts: now - hoursBack*3600000 - Math.floor(r()*3600000),
      sensorRef: r() > 0.6 ? s.id : '', photo:'', risk: pick(r, SEVS)
    };
  }).sort((a,b) => b.ts - a.ts);

  /* ---- infrastructure ---- */
  const infra = [];
  INFRA_TYPES.forEach((cat, ci) => {
    INFRA_NAMES[cat.k].slice(0, 2).forEach((nm, ni) => {
      const s = sensors[(ci*2 + ni) % sensors.length];
      const aqi = clamp(s.aqi + between(r,-25,35), 30, 470);
      const vuln = clamp(Math.round(aqi/5 + between(r,-8,14)), 12, 99);
      infra.push({
        id:'IN-'+key.slice(0,2).toUpperCase()+pad(infra.length+1), category:cat.k, name:nm,
        location:s.name, aqi, exposure: between(r, 2, 90) * 1000, vulnerability:vuln,
        risk: vuln>72?'Critical':vuln>55?'High':vuln>38?'Medium':'Low',
        action: pick(r, [
          'Distribute N95 masks and shift outdoor activity indoors.',
          'Install an indoor air purification unit in high-occupancy rooms.',
          'Restrict heavy vehicle movement within 500 m during peak hours.',
          'Add a continuous monitor and review readings twice daily.',
          'Prepare a respiratory triage protocol for the next 72 hours.'
        ]),
        ts: now - Math.round(r()*180)*60000, status:'Monitored'
      });
    });
  });

  /* ---- alerts seeded per city ---- */
  const alerts = hotspots.slice(0, 3).map((h, i) => ({
    id:'AL-' + key.slice(0,2).toUpperCase() + pad(i+1), city:key,
    title: h.risk === 'Critical'
      ? 'Severe AQI spike predicted in ' + h.name
      : 'Elevated ' + h.source.toLowerCase() + ' detected in ' + h.name,
    location:h.name, risk:h.risk, aqi:h.aqi, source:h.source, action:h.action,
    ts: now - (i*47+18)*60000, to:'', priority: h.risk === 'Critical' ? 'Critical' : 'High',
    status:'Open', seeded:true
  }));

  /* ---- weather + history ---- */
  const weather = {
    temp: def.temp + between(r,-2,3), hum: def.hum + between(r,-6,7),
    wind: +(def.wind + between(r,-2,4,1)).toFixed(1), dir: pick(r, DIRS),
    vis: +(between(r, 900, 4200)/1000).toFixed(1), pressure: between(r, 1002, 1018)
  };
  const history = Array.from({length:30}, (_,i) => clamp(Math.round(def.base + Math.sin(i/2.4)*34 + between(r,-46,46)), 35, 470));

  const live = sensors.filter(s => s.online);
  const avg = Math.round(live.reduce((a,s) => a + s.aqi, 0) / live.length);
  const d = {
    key, def, sensors, zones, roads, hotspots, reports, infra, alerts, weather, history,
    aqi: avg, ...pollutantsFor(avg, rngFrom('poll-'+key)),
    ts: now
  };
  CACHE[key] = d;
  return d;
}

/* live view of a city = seeded data + anything the user added in this browser */
function city(k){
  const key = k || S.city;
  const d = cityData(key);
  const mine = (S.reports[key] || []);
  return { ...d, reports: mine.concat(d.reports).sort((a,b) => b.ts - a.ts) };
}
function allAlerts(){
  const k = S.city;
  const seeded = cityData(k).alerts.map(a => ({...a,
    status: S.acked[a.id] ? 'Acknowledged' : a.status,
    team: S.assigned[a.id] || ''
  }));
  const mine = S.alerts.filter(a => a.city === k).map(a => ({...a,
    status: S.acked[a.id] ? 'Acknowledged' : a.status,
    team: S.assigned[a.id] || a.team || ''
  }));
  return mine.concat(seeded).sort((a,b) => b.ts - a.ts);
}

/* refresh nudges the seeded numbers so "Refresh" visibly does something (demo mode only) */
function jitterCity(key){
  const d = CACHE[key]; if (!d) return;
  d.sensors.forEach(s => {
    s.aqi = clamp(s.aqi + rnd(-14, 15), 25, 470);
    Object.assign(s, pollutantsFor(s.aqi, Math.random));
    s.risk = s.aqi>300?'Critical':s.aqi>200?'High':s.aqi>120?'Medium':'Low';
    s.ts = Date.now() - rnd(0,2)*60000;
  });
  const live = d.sensors.filter(s => s.online);
  d.aqi = Math.round(live.reduce((a,s) => a + s.aqi, 0) / live.length);
  Object.assign(d, pollutantsFor(d.aqi, Math.random));
  d.weather.temp += rnd(-1,1); d.weather.hum = clamp(d.weather.hum + rnd(-3,3), 12, 98);
  d.weather.wind = +clamp(d.weather.wind + rnd(-1,1), 1, 28).toFixed(1);
  d.ts = Date.now();
}

