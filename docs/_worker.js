// _worker.js - 完整版
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const base = `${url.protocol}//${url.host}`;

    // ===== 1. 静态资源放行（最先匹配） =====
    if (
      path.startsWith('/picture/') ||
      path.startsWith('/css/') ||
      path.startsWith('/js/') ||
      path.startsWith('/img/') ||
      path === '/favicon.ico' ||
      path.endsWith('.ico') ||
      path.endsWith('.png') ||
      path.endsWith('.jpg') ||
      path.endsWith('.jpeg') ||
      path.endsWith('.webp') ||
      path.endsWith('.json')
    ) {
      return fetch(request.url);
    }

    // ===== 2. 首页 =====
    if (path === '/' || path === '/index.html') {
      const resp = await fetch(new URL('/index.html', base).toString());
      return new Response(resp.body, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // ===== 3. API 文档 =====
    if (path === '/api') {
      const html = `<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>图片 API 服务</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; max-width: 780px; margin: 3rem auto; padding: 0 1.5rem; line-height: 1.8; color: #1a1a2e; background: #f8f9fa; }
h1 { font-size: 2rem; font-weight: 700; color: #16213e; margin-bottom: 0.5rem; }
.subtitle { color: #6c757d; font-size: 1rem; margin-bottom: 2rem; border-left: 4px solid #4a90d9; padding-left: 1rem; }
.card { background: #fff; border-radius: 12px; padding: 1.5rem 2rem; margin-bottom: 1.25rem; border: 1px solid #e9ecef; }
.card h2 { font-size: 1.1rem; color: #4a90d9; margin-bottom: 0.5rem; }
.card code { background: #f1f3f5; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.85rem; color: #d63384; }
.footer { margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid #e9ecef; text-align: center; color: #868e96; font-size: 0.85rem; }
.footer a { color: #4a90d9; text-decoration: none; }
@media (max-width: 500px) { body { margin: 1.5rem auto; } .card { padding: 1rem 1.25rem; } h1 { font-size: 1.5rem; } }
</style>
</head>
<body>
<h1>📷 图片 API 服务</h1>
<div class="subtitle">提供随机图像和每日图像接口，基于 Bing 每日壁纸</div>
<div class="card"><h2>🎲 /api/random</h2><p><code>${base}/api/random</code> → 返回随机图片</p><p><code>${base}/api/random?redirect=true</code> → 302 重定向</p></div>
<div class="card"><h2>📅 /api/daily</h2><p><code>${base}/api/daily</code> → 今日图片 (WebP)</p><p><code>${base}/api/daily?format=jpeg</code> → JPEG</p><p><code>${base}/api/daily?format=original</code> → 原始 JPEG</p><p><code>${base}/api/daily?redirect=true</code> → 302 重定向</p></div>
<div class="card"><h2>ℹ️ 使用说明</h2><p>所有图片来自 Bing 每日壁纸，仅限个人使用。</p></div>
<div class="footer">Powered by Cloudflare Workers · <a href="${base}">返回首页</a></div>
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

    // ===== 6. 其他请求返回 404 =====
    return new Response('Not Found', { status: 404 });
  }
};
