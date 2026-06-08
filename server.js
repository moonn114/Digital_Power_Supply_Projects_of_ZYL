/**
 * Digital Power Lab 博客 — 本地开发服务器 (Node.js)
 * 零依赖，仅使用 Node.js 内置模块
 * 启动: node server.js
 * 访问: http://localhost:8080
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  // 去掉 query string 和 hash
  const urlPath = req.url.split('?')[0].split('#')[0];
  const filePath = urlPath === '/' || urlPath === ''
    ? path.join(ROOT, 'index.html')
    : path.join(ROOT, urlPath);

  // 安全检查：防止目录穿越
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('403 Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA fallback: 如果文件不存在，尝试返回 index.html
        // （若不需要 SPA fallback 可删除下面三行）
        // fs.readFile(path.join(ROOT, 'index.html'), (_, d) => {
        //   res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        //   res.end(d);
        // });
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 - 页面不存在</h1>');
        return;
      }
      res.writeHead(500);
      res.end('500 Internal Server Error');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);

    // 日志
    const icon = res.statusCode === 200 ? '📄' : '⚠️';
    console.log(`  ${icon} ${req.method} ${urlPath}`);
  });
});

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   ⚡ Digital Power Lab Blog        ║
║   数字电源项目博客                   ║
╠══════════════════════════════════════╣
║   本地地址: http://localhost:${PORT}    ║
║   按 Ctrl+C 停止服务器              ║
╚══════════════════════════════════════╝
`);
  console.log('  服务已启动，在浏览器中打开 ↑ 上方地址\n');

  // 尝试自动打开浏览器
  const { exec } = require('child_process');
  const url = `http://localhost:${PORT}`;
  const cmd = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd, () => {});
});
