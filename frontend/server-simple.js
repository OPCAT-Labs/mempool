const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Backend endpoints configuration
const BACKEND_API = process.env.BACKEND_API || 'https://testnet.opcatlabs.io';
const ELECTRS_API = process.env.ELECTRS_API || 'http://157.245.154.198:3006';
const TRACKER_API = process.env.TRACKER_API || 'http://157.245.154.198:3000';

const distFolder = path.join(__dirname, 'dist/mempool/browser');
const defaultLang = 'en-US';

console.log(`[server] Starting simple Express server...`);
console.log(`[server] Serving files from: ${distFolder}`);
console.log(`[server] Backend API: ${BACKEND_API}`);
console.log(`[server] Electrs API: ${ELECTRS_API}`);
console.log(`[server] Tracker API: ${TRACKER_API}`);

// ======================
// API Proxy Configuration
// ======================

// 1. Tracker API - /api/tracker/ -> TRACKER_API
app.use('/api/tracker', createProxyMiddleware({
  target: TRACKER_API,
  changeOrigin: true,
  pathRewrite: {
    '^/api/tracker': '',
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[proxy] Tracker: ${req.method} ${req.url} -> ${TRACKER_API}${req.path.replace('/api/tracker', '')}`);
  },
}));

// 2. Testnet API - /testnet/api/ -> BACKEND_API/api/v1/
app.use('/testnet/api', createProxyMiddleware({
  target: BACKEND_API,
  changeOrigin: true,
  pathRewrite: {
    '^/testnet/api': '/api/v1',
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[proxy] Testnet: ${req.method} ${req.url} -> ${BACKEND_API}/api/v1${req.path.replace('/testnet/api', '')}`);
  },
}));

// 3. Address UTXO endpoint - /api/address/.*/utxo -> ELECTRS_API
app.use(/^\/api\/address\/.*\/utxo$/, createProxyMiddleware({
  target: ELECTRS_API,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '',
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[proxy] Address UTXO: ${req.method} ${req.url} -> ${ELECTRS_API}${req.path.replace('/api', '')}`);
  },
}));

// 4. Scripthash txs endpoint - /api/scripthash/.*/txs -> BACKEND_API/api/v1/
app.use(/^\/api\/scripthash\/.*\/txs$/, createProxyMiddleware({
  target: BACKEND_API,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api/v1',
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[proxy] Scripthash txs: ${req.method} ${req.url} -> ${BACKEND_API}/api/v1${req.path.replace('/api', '')}`);
  },
}));

// 5. Scripthash endpoints - /api/scripthash/ -> ELECTRS_API
app.use(/^\/api\/scripthash\//, createProxyMiddleware({
  target: ELECTRS_API,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '',
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[proxy] Scripthash: ${req.method} ${req.url} -> ${ELECTRS_API}${req.path.replace('/api', '')}`);
  },
}));

// 6. Address txs endpoint - /api/address/.*/txs -> ELECTRS_API
app.use(/^\/api\/address\/.*\/txs/, createProxyMiddleware({
  target: ELECTRS_API,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '',
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[proxy] Address txs: ${req.method} ${req.url} -> ${ELECTRS_API}${req.path.replace('/api', '')}`);
  },
}));

// 7. Address endpoints - /api/address/ -> ELECTRS_API
app.use(/^\/api\/address\//, createProxyMiddleware({
  target: ELECTRS_API,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '',
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[proxy] Address: ${req.method} ${req.url} -> ${ELECTRS_API}${req.path.replace('/api', '')}`);
  },
}));

// 8. WebSocket for API v1 - /api/v1/ws -> BACKEND_API
app.use('/api/v1/ws', createProxyMiddleware({
  target: BACKEND_API,
  changeOrigin: true,
  ws: true,
  pathRewrite: {
    '^/api/v1/ws': '/',
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[proxy] WebSocket v1: ${req.method} ${req.url} -> ${BACKEND_API}/`);
  },
}));

// 9. API v1 - /api/v1/ -> BACKEND_API/api/v1/
app.use('/api/v1', createProxyMiddleware({
  target: BACKEND_API,
  changeOrigin: true,
  ws: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[proxy] API v1: ${req.method} ${req.url} -> ${BACKEND_API}${req.path}`);
  },
}));

// 10. General API - /api/ -> BACKEND_API/api/v1/
app.use('/api', createProxyMiddleware({
  target: BACKEND_API,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api/v1',
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[proxy] API: ${req.method} ${req.url} -> ${BACKEND_API}/api/v1${req.path.replace('/api', '')}`);
  },
}));

// 11. Main WebSocket - /ws -> BACKEND_API
app.use('/ws', createProxyMiddleware({
  target: BACKEND_API,
  changeOrigin: true,
  ws: true,
  pathRewrite: {
    '^/ws': '/',
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[proxy] WebSocket: ${req.method} ${req.url} -> ${BACKEND_API}/`);
  },
}));

// ======================
// Static File Serving
// ======================

// Serve resources with longer cache
app.use('/resources', express.static(path.join(distFolder, 'resources'), {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    // config.* and customize.* files should have shorter cache
    if (filePath.includes('config.') || filePath.includes('customize.')) {
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    }
  }
}));

// Serve static files for each language
const supportedLanguages = [
  'ar', 'bg', 'bs', 'cs', 'da', 'de', 'et', 'el', 'es', 'eo', 'eu', 'fa',
  'fr', 'gl', 'ko', 'hr', 'id', 'it', 'he', 'ka', 'lv', 'lt', 'hu', 'mk',
  'ms', 'nl', 'ja', 'nb', 'nn', 'pl', 'pt', 'pt-BR', 'ro', 'ru', 'sk', 'sl',
  'sr', 'sh', 'fi', 'sv', 'th', 'tr', 'uk', 'vi', 'zh', 'hi', 'en-US'
];

// Serve language-specific static files
supportedLanguages.forEach(lang => {
  const langPath = path.join(distFolder, lang);
  app.use(`/${lang}`, express.static(langPath, {
    maxAge: '10m',
  }));
});

// Serve static files from default language (for root-level assets)
app.use(express.static(path.join(distFolder, defaultLang), {
  maxAge: '10m',
  index: false, // Don't serve index.html here
}));

// Static API docs
app.get(['/api', '/api/'], (req, res) => {
  res.sendFile(path.join(distFolder, defaultLang, 'index.html'));
});

// Fallback for HTML routes only - don't intercept static files
app.get('*', (req, res) => {
  // Skip if it's a static file request
  const ext = path.extname(req.path);
  if (ext && ext !== '.html') {
    return res.status(404).send('File not found');
  }
  // Try to determine language from URL or use default
  const urlLang = supportedLanguages.find(lang => req.path.startsWith(`/${lang}`));
  const lang = urlLang || defaultLang;

  const indexPath = path.join(distFolder, lang, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`[server] Error serving ${indexPath}:`, err.message);
      res.status(404).sendFile(path.join(distFolder, defaultLang, 'index.html'));
    }
  });
});

// ======================
// Start Server
// ======================

const server = app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  Mempool Frontend Server`);
  console.log(`========================================`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  Static files: ${distFolder}`);
  console.log(`  Default language: ${defaultLang}`);
  console.log(`========================================\n`);
});

// Handle WebSocket upgrade
server.on('upgrade', (req, socket, head) => {
  console.log(`[server] WebSocket upgrade request: ${req.url}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('[server] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[server] SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('[server] Server closed');
    process.exit(0);
  });
});
