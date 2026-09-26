'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load environment variables from .env or .env.example
if (!process.env.WAQI_TOKEN) {
  try {
    const envPath = path.join(__dirname, '.env');
    const envExPath = path.join(__dirname, '.env.example');
    const targetPath = fs.existsSync(envPath) ? envPath : (fs.existsSync(envExPath) ? envExPath : null);
    if (targetPath) {
      const content = fs.readFileSync(targetPath, 'utf8');
      const match = content.match(/WAQI_TOKEN\s*=\s*(.+)/);
      if (match) process.env.WAQI_TOKEN = match[1].trim();
    }
  } catch(e) {}
}

const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const airQualityHandler = require('./api/air-quality');
const healthHandler = require('./api/health');
const searchHandler = require('./api/search');

function adaptRes(res) {
  res.setHeader = res.setHeader.bind(res);
  res.status = function(code) {
    res.statusCode = code;
    return {
      json: function(data) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      }
    };
  };
  return res;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  req.query = parsedUrl.query;

  // Handle API routes
  if (pathname === '/api/air-quality') {
    return airQualityHandler(req, adaptRes(res));
  }
  if (pathname === '/api/health') {
    return healthHandler(req, adaptRes(res));
  }
  if (pathname === '/api/search') {
    return searchHandler(req, adaptRes(res));
  }

  // Handle static files
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(__dirname, safePath === '\\' || safePath === '/' ? 'index.html' : safePath);

  if (!filePath.startsWith(__dirname)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end('<h1>404 Not Found</h1>');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(` AirShield Server running locally at:`);
  console.log(` http://localhost:${PORT}`);
  console.log(` WAQI Token status: ${process.env.WAQI_TOKEN ? 'Configured' : 'Missing'}`);
  console.log(`==================================================\n`);
});
