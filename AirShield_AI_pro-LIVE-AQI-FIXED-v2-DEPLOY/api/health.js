'use strict';
const { getAQIByLocation } = require('../backend/waqi');

module.exports = async function handler(_req,res){
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
  const tokenConfigured = Boolean(String(process.env.WAQI_TOKEN || '').trim());
  let waqiReachable = false;
  let waqiError = '';
  if (tokenConfigured) {
    try { await getAQIByLocation('Delhi','Delhi'); waqiReachable = true; }
    catch (e) { waqiError = e?.message || 'WAQI connection failed'; }
  } else {
    waqiError = 'WAQI_TOKEN is not configured in the deployment environment';
  }
  return res.status(200).json({
    ok: tokenConfigured && waqiReachable,
    service:'airshield-vercel', provider:'WAQI', tokenConfigured, waqiReachable,
    error: waqiReachable ? null : waqiError,
    time:new Date().toISOString()
  });
};
