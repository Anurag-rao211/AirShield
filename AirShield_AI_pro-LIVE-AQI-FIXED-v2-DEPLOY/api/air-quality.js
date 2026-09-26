'use strict';
const { getAQIByLocation } = require('../backend/waqi');

module.exports = async function handler(req, res){
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma','no-cache');
  res.setHeader('Expires','0');
  const location = String(req.query?.location || '').trim();
  const state = String(req.query?.state || '').trim();
  const uid = String(req.query?.uid || '').trim();
  if (!location || location.length > 100) return res.status(400).json({ok:false,error:'A valid location is required.'});
  try { return res.status(200).json({ok:true,data:await getAQIByLocation(location,state,uid)}); }
  catch(error){ console.error('[WAQI]',error.message); return res.status(502).json({ok:false,error:error.message}); }
};
