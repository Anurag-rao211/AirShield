'use strict';
const { searchIndia } = require('../backend/waqi');
module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const q=String(req.query?.q||'').trim();
  if(q.length<2 || q.length>80) return res.status(400).json({ok:false,error:'Search text must be 2-80 characters.'});
  try{
    const data=await searchIndia(q);
    return res.status(200).json({ok:true,results:data.slice(0,12).map(x=>({uid:x.uid,aqi:x.aqi,name:x.station?.name||'',geo:x.station?.geo||null,url:x.station?.url||null}))});
  }catch(error){ console.error('[WAQI SEARCH]', error.message); return res.status(502).json({ok:false,error:error.message}); }
};
