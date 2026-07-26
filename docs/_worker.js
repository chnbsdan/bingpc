// _worker.js - 完整版（首页内嵌）
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const base = `${url.protocol}//${url.host}`;

    // ===== 1. 静态资源放行 =====
    if (
      path.startsWith('/picture/') ||
      path.startsWith('/css/') ||
      path.startsWith('/js/') ||
      path.startsWith('/img/') ||
      path.endsWith('.ico') ||
      path.endsWith('.png') ||
      path.endsWith('.jpg') ||
      path.endsWith('.jpeg') ||
      path.endsWith('.webp') ||
      path.endsWith('.json')
    ) {
      return fetch(request.url);
    }

    // ===== 2. 首页 - 直接返回 HTML 字符串（不 fetch） =====
    if (path === '/' || path === '/index.html') {
      const html = `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>必应壁纸</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #121212; color: #e0e0e0; }
    h1 { text-align: center; color: #fff; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
    .card { background: #1e1e1e; border-radius: 12px; overflow: hidden; transition: transform 0.2s; }
    .card:hover { transform: translateY(-5px); }
    .card img { width: 100%; height: 200px; object-fit: cover; }
    .card .info { padding: 15px; }
    .card .date { font-size: 0.9rem; color: #aaa; }
    .card .copyright { font-size: 0.8rem; color: #666; margin-top: 5px; }
  </style>
</head>
<body>
  <h1>🌅 Bing 每日壁纸</h1>
  <div id="grid" class="grid">加载中...</div>
  <script>
    fetch('/picture/index.json')
      .then(r => r.json())
      .then(data => {
        const grid = document.getElementById('grid');
        grid.innerHTML = data.map(item => \`
          <div class="card">
            <img src="\${item.path}" alt="\${item.date}" loading="lazy" />
            <div class="info">
              <div class="date">\${item.date}</div>
              <div class="copyright">\${item.copyright || ''}</div>
            </div>
          </div>
        \`).join('');
      })
      .catch(() => { document.getElementById('grid').textContent = '加载失败'; });
  </script>
</body>
</html>`;
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // ===== 3. API 文档 =====
    if (path === '/api') {
      const html = `<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8"><title>图片 API 服务</title>
<style>
body { font-family: system-ui; max-width: 720px; margin: 2rem auto; padding: 1rem; line-height: 1.6; background: #f8f9fa; color: #1a1a2e; }
h1 { color: #16213e; }
code { background: #f1f3f5; padding: 0.2rem 0.4rem; border-radius: 4px; }
.card { background: #fff; border-radius: 12px; padding: 1.5rem 2rem; margin-bottom: 1.25rem; border: 1px solid #e9ecef; }
.footer { margin-top: 2.5rem; text-align: center; color: #868e96; }
</style>
</head>
<body>
<h1>📷 图片 API 服务</h1>
<div class="card">
  <h2>/api/random</h2>
  <p><code>${base}/api/random</code> → 随机图片</p>
  <p><code>${base}/api/random?redirect=true</code> → 重定向</p>
</div>
<div class="card">
  <h2>/api/daily</h2>
  <p><code>${base}/api/daily</code> → 今日图片 (WebP)</p>
  <p><code>${base}/api/daily?format=jpeg</code> → JPEG</p>
  <p><code>${base}/api/daily?redirect=true</code> → 重定向</p>
</div>
<div class="footer">Powered by Cloudflare</div>
</body>
</html>`;
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // ===== 4. 随机图片 =====
    if (path === '/api/random') {
      try {
        const resp = await fetch(`${base}/picture/index.json`);
        if (!resp.ok) {
          return new Response('Failed to load index.json', { status: 502 });
        }
        const data = await resp.json();
        if (!data || data.length === 0) {
          return new Response('No images found', { status: 404 });
        }
        const random = data[Math.floor(Math.random() * data.length)];
        const redirect = url.searchParams.get('redirect') === 'true';
        if (redirect) {
          return Response.redirect(random.path, 302);
        }
        const imgResp = await fetch(`${base}${random.path}`);
        return new Response(imgResp.body, {
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=10800'
          }
        });
      } catch {
        return new Response('Internal Server Error', { status: 500 });
      }
    }

    // ===== 5. 每日图片 =====
    if (path === '/api/daily') {
      try {
        const resp = await fetch(`${base}/picture/index.json`);
        if (!resp.ok) {
          return new Response('Failed to load index.json', { status: 502 });
        }
        const data = await resp.json();
        if (!data || data.length === 0) {
          return new Response('No images found', { status: 404 });
        }
        const daily = data[0];
        const redirect = url.searchParams.get('redirect') === 'true';
        if (redirect) {
          return Response.redirect(daily.path, 302);
        }
        const imgResp = await fetch(`${base}${daily.path}`);
        return new Response(imgResp.body, {
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=10800'
          }
        });
      } catch {
        return new Response('Internal Server Error', { status: 500 });
      }
    }

    // ===== 6. 其他 =====
    return new Response('Not Found', { status: 404 });
  }
};
