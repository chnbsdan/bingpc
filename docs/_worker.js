// _worker.js - 完整版
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const base = `${url.protocol}//${url.host}`;

    // ===== 1. 静态资源直接放行 =====
    if (
      path === '/' ||
      path === '/index.html' ||
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

    // ===== 2. API 文档 =====
    if (path === '/api') {
      const html = `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>图片 API 服务</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      max-width: 780px;
      margin: 3rem auto;
      padding: 0 1.5rem;
      line-height: 1.8;
      color: #1a1a2e;
      background: #f8f9fa;
    }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #16213e;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .subtitle {
      color: #6c757d;
      font-size: 1rem;
      margin-bottom: 2rem;
      border-left: 4px solid #4a90d9;
      padding-left: 1rem;
    }
    .card {
      background: #fff;
      border-radius: 12px;
      padding: 1.5rem 2rem;
      margin-bottom: 1.25rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      border: 1px solid #e9ecef;
      transition: box-shadow 0.2s;
    }
    .card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    }
    .card h2 {
      font-size: 1.1rem;
      color: #4a90d9;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }
    .card p {
      margin: 0.25rem 0;
      color: #343a40;
    }
    .card code {
      background: #f1f3f5;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
      color: #d63384;
      word-break: break-all;
    }
    .footer {
      margin-top: 2.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e9ecef;
      text-align: center;
      color: #868e96;
      font-size: 0.85rem;
    }
    .footer a {
      color: #4a90d9;
      text-decoration: none;
    }
    @media (max-width: 500px) {
      body { margin: 1.5rem auto; }
      .card { padding: 1rem 1.25rem; }
      h1 { font-size: 1.5rem; }
    }
  </style>
</head>
<body>
  <h1>📷 图片 API 服务</h1>
  <div class="subtitle">提供随机图像和每日图像接口，基于 Bing 每日壁纸</div>

  <div class="card">
    <h2>🎲 /api/random</h2>
    <p><code>${base}/api/random</code> → 返回随机图片</p>
    <p><code>${base}/api/random?redirect=true</code> → 302 重定向到随机图片</p>
  </div>

  <div class="card">
    <h2>📅 /api/daily</h2>
    <p><code>${base}/api/daily</code> → 返回今日图片 (WebP)</p>
    <p><code>${base}/api/daily?format=jpeg</code> → 返回 JPEG 格式</p>
    <p><code>${base}/api/daily?format=original</code> → 返回原始 JPEG</p>
    <p><code>${base}/api/daily?redirect=true</code> → 302 重定向到今日图片</p>
  </div>

  <div class="card">
    <h2>ℹ️ 使用说明</h2>
    <p>所有图片来自 Bing 每日壁纸，仅限个人使用。</p>
    <p>数据更新时间：每日 12:00 (UTC+8)</p>
  </div>

  <div class="footer">
    Powered by Cloudflare Workers · <a href="${base}">返回首页</a>
  </div>
</body>
</html>`;
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // ===== 3. 随机图片 =====
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
      } catch (error) {
        return new Response('Internal Server Error', { status: 500 });
      }
    }

    // ===== 4. 每日图片 =====
    if (path === '/api/daily') {
      try {
        const format = url.searchParams.get('format') || 'webp';
        const redirect = url.searchParams.get('redirect') === 'true';

        // 先获取最新图片
        const resp = await fetch(`${base}/picture/index.json`);
        if (!resp.ok) {
          return new Response('Failed to load index.json', { status: 502 });
        }
        const data = await resp.json();
        if (!data || data.length === 0) {
          return new Response('No images found', { status: 404 });
        }

        const daily = data[0];
        let imagePath = daily.path;

        // 如果请求 JPEG 格式，尝试替换扩展名
        if (format === 'jpeg') {
          imagePath = imagePath.replace('.webp', '.jpg');
        } else if (format === 'original') {
          imagePath = imagePath.replace('.webp', '_original.jpg');
        }

        if (redirect) {
          return Response.redirect(imagePath, 302);
        }

        const imgResp = await fetch(`${base}${imagePath}`);
        if (!imgResp.ok) {
          // 如果 JPEG 不存在，回退到 WebP
          const fallbackResp = await fetch(`${base}${daily.path}`);
          return new Response(fallbackResp.body, {
            headers: {
              'Content-Type': 'image/webp',
              'Cache-Control': 'public, max-age=10800'
            }
          });
        }

        const contentType = format === 'webp' ? 'image/webp' : 'image/jpeg';
        return new Response(imgResp.body, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=10800'
          }
        });
      } catch (error) {
        return new Response('Internal Server Error', { status: 500 });
      }
    }

    // ===== 5. 其他请求放行 =====
    return fetch(request.url);
  }
};
