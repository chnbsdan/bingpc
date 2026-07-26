// _worker.js - 替代 functions/api
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const base = `${url.protocol}//${url.host}`;

    // ===== API 文档 =====
    if (path === '/api') {
      const html = `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>图片 API 服务</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 1rem; line-height: 1.6; }
    h1 { color: #333; }
    code { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 4px; }
    .endpoint { margin-bottom: 1.5rem; }
  </style>
</head>
<body>
  <h1>📷 图片 API 服务</h1>
  <p>提供 <strong>随机图像</strong> 和 <strong>每日图像</strong> 接口。</p>
  <div class="endpoint">
    <h2>/api/random</h2>
    <ul>
      <li><code>${base}/api/random</code> → 随机图片</li>
      <li><code>${base}/api/random?redirect=true</code> → 随机图片（重定向）</li>
    </ul>
  </div>
  <div class="endpoint">
    <h2>/api/daily</h2>
    <ul>
      <li><code>${base}/api/daily</code> → 今日图像（WebP）</li>
      <li><code>${base}/api/daily?format=jpeg</code> → 压缩 JPEG</li>
      <li><code>${base}/api/daily?format=original</code> → 原始 JPEG</li>
      <li><code>${base}/api/daily?redirect=true</code> → 今日图像（重定向）</li>
    </ul>
  </div>
  <footer><p style="margin-top:2rem; color:#777;">Powered by Cloudflare</p></footer>
</body>
</html>`;
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // ===== 随机图片 =====
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

    // ===== 每日图片 =====
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

    // ===== 其他请求 =====
    return fetch(request);
  }
};
