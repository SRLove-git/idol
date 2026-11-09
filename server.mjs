import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "public");
const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || "127.0.0.1";
const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:3000";
const TOKEN_COOKIE = "idol_token";
const SITE_ORIGIN = (process.env.PUBLIC_SITE_URL || "https://idol-sg.com").replace(/\/+$/, "");
const SEO_IMAGE_PATH = "/photos/banner-studio-brand-1.jpg";
const SEO_IMAGE = `${SITE_ORIGIN}${SEO_IMAGE_PATH}`;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const SPA_ROUTES = new Set(["/", "/booking", "/highlights", "/login", "/register", "/forgot-password", "/account"]);
const SEO_PAGES = {
  "/": {
    title: "IDOL BEADS 新加坡拼豆工作室 | Perler Bead Workshop Singapore",
    description: "IDOL BEADS 是位于新加坡牛车水的 DIY 拼豆工作室。提供丰富图案、专业烫印、免费工具与会员优惠，欢迎一个人放松创作或与朋友一起体验。",
    ogDescription: "位于新加坡牛车水的 DIY 拼豆工作室，提供丰富图案、专业烫印、免费工具与会员优惠。",
    pageType: "WebPage",
    index: true,
  },
  "/booking": {
    title: "预约拼豆体验 | IDOL BEADS Singapore",
    description: "预约 IDOL BEADS 新加坡牛车水拼豆体验。选择日期、时长和人数，提交联系方式后等待商家邮件确认。",
    ogDescription: "选择日期、时长和人数，预约 IDOL BEADS 新加坡牛车水拼豆体验。",
    pageType: "WebPage",
    index: true,
  },
  "/highlights": {
    title: "拼豆作品与创作灵感 | IDOL BEADS Singapore",
    description: "浏览 IDOL BEADS 拼豆作品集，从萌趣小物到人气角色，寻找下一次 DIY 拼豆创作灵感。",
    ogDescription: "浏览 IDOL BEADS 拼豆作品集，寻找下一次 DIY 拼豆创作灵感。",
    pageType: "CollectionPage",
    index: true,
  },
  "/login": { title: "登录 | IDOL BEADS", description: "登录 IDOL BEADS 账号。", pageType: "WebPage", index: false },
  "/register": { title: "注册 | IDOL BEADS", description: "创建 IDOL BEADS 账号。", pageType: "WebPage", index: false },
  "/forgot-password": { title: "找回密码 | IDOL BEADS", description: "重置 IDOL BEADS 账号密码。", pageType: "WebPage", index: false },
  "/account": { title: "我的账号与预约 | IDOL BEADS", description: "查看 IDOL BEADS 预约与会员信息。", pageType: "WebPage", index: false },
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function structuredData(pathname, seo) {
  const canonical = `${SITE_ORIGIN}${pathname === "/" ? "/" : pathname}`;
  const graph = [
    {
      "@type": "LocalBusiness",
      "@id": `${SITE_ORIGIN}/#business`,
      name: "IDOL BEADS",
      url: `${SITE_ORIGIN}/`,
      image: SEO_IMAGE,
      description: "DIY 拼豆工作室与 Perler bead workshop",
      priceRange: "$",
      address: {
        "@type": "PostalAddress",
        streetAddress: "18A Sago Street",
        postalCode: "059017",
        addressLocality: "Singapore",
        addressCountry: "SG",
      },
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          opens: "10:00",
          closes: "20:00",
        },
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Saturday", "Sunday"],
          opens: "10:00",
          closes: "21:00",
        },
      ],
      sameAs: [
        "https://www.instagram.com/idol_beads",
        "https://www.xiaohongshu.com/user/profile/650d5c8e00000000120075e5",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_ORIGIN}/#website`,
      url: `${SITE_ORIGIN}/`,
      name: "IDOL BEADS",
      inLanguage: ["zh-CN", "en"],
    },
    {
      "@type": seo.pageType,
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: seo.title,
      description: seo.description,
      isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
      about: { "@id": `${SITE_ORIGIN}/#business` },
      inLanguage: ["zh-CN", "en"],
    },
  ];
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replaceAll("<", "\\u003c");
}

function seoHead(pathname, store) {
  const baseSeo = SEO_PAGES[pathname] || SEO_PAGES["/"];
  const configuredMeta = pathname === "/" && store?.siteContent?.meta && typeof store.siteContent.meta === "object"
    ? store.siteContent.meta
    : null;
  const seo = {
    ...baseSeo,
    title: typeof configuredMeta?.title === "string" && configuredMeta.title.trim()
      ? configuredMeta.title.trim()
      : baseSeo.title,
    description: typeof configuredMeta?.description === "string" && configuredMeta.description.trim()
      ? configuredMeta.description.trim()
      : baseSeo.description,
  };
  const canonical = `${SITE_ORIGIN}${pathname === "/" ? "/" : pathname}`;
  const robots = seo.index
    ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    : "noindex, nofollow";
  const title = escapeHtml(seo.title);
  const description = escapeHtml(seo.description);
  const ogDescription = escapeHtml(seo.ogDescription || seo.description);
  return `  <meta name="x-seo-boundary" content="start">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="IDOL BEADS">
  <meta property="og:locale" content="zh_CN">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${ogDescription}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(SEO_IMAGE)}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1585">
  <meta property="og:image:height" content="992">
  <meta property="og:image:alt" content="IDOL BEADS 新加坡牛车水拼豆工作室">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${ogDescription}">
  <meta name="twitter:image" content="${escapeHtml(SEO_IMAGE)}">
  <script type="application/ld+json" id="seo-structured-data">${structuredData(pathname, seo)}</script>
  <meta name="x-seo-boundary" content="end">`;
}

function renderSeoPage(html, pathname, store) {
  const boundary = /<meta name="x-seo-boundary" content="start">[\s\S]*?<meta name="x-seo-boundary" content="end">/i;
  return boundary.test(html) ? html.replace(boundary, seoHead(pathname, store)) : html;
}

function forwardedHeaders(req) {
  const incoming = Array.isArray(req.headers["x-forwarded-for"])
    ? req.headers["x-forwarded-for"].join(", ")
    : req.headers["x-forwarded-for"];
  const remoteAddress = req.socket.remoteAddress;
  const forwardedFor = [incoming, remoteAddress].filter(Boolean).join(", ");
  const forwardedProto = req.headers["x-forwarded-proto"] || (req.socket.encrypted ? "https" : "http");
  const headers = {};
  if (forwardedFor) headers["x-forwarded-for"] = forwardedFor;
  if (forwardedProto) headers["x-forwarded-proto"] = forwardedProto;
  if (req.headers.host) headers["x-forwarded-host"] = req.headers.host;
  return headers;
}

function isSecureRequest(req) {
  const proto = Array.isArray(req.headers["x-forwarded-proto"])
    ? req.headers["x-forwarded-proto"][0]
    : req.headers["x-forwarded-proto"];
  return req.socket.encrypted || proto?.split(",")[0].trim().toLowerCase() === "https";
}

async function callBackend(pathname, { method = "GET", token, body, request } = {}) {
  const headers = request ? forwardedHeaders(request) : {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${BACKEND}/api${pathname}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, data };
}

let seoStoreCache = { expiresAt: 0, value: null };

async function loadSeoStore(request) {
  if (Date.now() < seoStoreCache.expiresAt) return seoStoreCache.value;
  try {
    const result = await callBackend("/stores/1", { request });
    if (result.status >= 200 && result.status < 300 && result.data && typeof result.data === "object") {
      seoStoreCache = { expiresAt: Date.now() + 60_000, value: result.data };
      return result.data;
    }
  } catch {
    // SEO 后台数据不可用时继续使用内置内容，不能阻断官网页面。
  }
  seoStoreCache = { expiresAt: Date.now() + 10_000, value: seoStoreCache.value };
  return seoStoreCache.value;
}

/** 透传 multipart 上传与后端静态资源，不对二进制内容做 JSON 转换。 */
async function proxyRaw(req, res, target, token) {
  const headers = forwardedHeaders(req);
  if (req.headers["content-type"]) headers["content-type"] = req.headers["content-type"];
  if (token) headers.authorization = `Bearer ${token}`;
  const options = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    options.body = req;
    options.duplex = "half";
  }
  const response = await fetch(target, options);
  const responseHeaders = {};
  for (const name of ["content-type", "content-length", "cache-control", "etag", "last-modified"]) {
    const value = response.headers.get(name);
    if (value) responseHeaders[name] = value;
  }
  res.writeHead(response.status, responseHeaders);
  if (!response.body || req.method === "HEAD") {
    res.end();
    return;
  }
  for await (const chunk of response.body) res.write(chunk);
  res.end();
}

function parseCookies(req) {
  const cookies = {};
  for (const part of (req.headers.cookie || "").split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function tokenFrom(req) {
  return parseCookies(req)[TOKEN_COOKIE] || null;
}

function setToken(req, res, token) {
  const secure = isSecureRequest(req) ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${TOKEN_COOKIE}=${encodeURIComponent(token)}; HttpOnly${secure}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
  );
}

function clearToken(req, res) {
  const secure = isSecureRequest(req) ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${TOKEN_COOKIE}=; HttpOnly${secure}; Path=/; SameSite=Lax; Max-Age=0`,
  );
}

function redirect(res, location, status = 302) {
  res.writeHead(status, { Location: location });
  res.end();
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(typeof data === "string" ? JSON.stringify({ message: data }) : JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(new Error("request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (req.headers["content-type"]?.includes("application/json")) {
        try {
          resolve(JSON.parse(raw || "{}"));
        } catch {
          resolve({});
        }
        return;
      }
      resolve(Object.fromEntries(new URLSearchParams(raw)));
    });
    req.on("error", reject);
  });
}

function resolveFile(pathname) {
  const candidate = path.resolve(PUBLIC, `.${pathname}`);
  if (!candidate.startsWith(`${PUBLIC}${path.sep}`) && candidate !== PUBLIC) return null;
  try {
    return fs.statSync(candidate).isFile() ? candidate : null;
  } catch {
    return null;
  }
}

function serveFile(req, res, filePath) {
  const ext = path.extname(filePath);
  const stat = fs.statSync(filePath);
  const etag = `W/"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;
  const relativePath = path.relative(PUBLIC, filePath).split(path.sep).join('/');
  const headers = {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": "no-cache",
    "ETag": etag,
    "Last-Modified": stat.mtime.toUTCString(),
  };
  if (relativePath === "admin/index.html" || relativePath === "wechat.html") {
    headers["X-Robots-Tag"] = "noindex, nofollow";
  }
  if (/^assets\/[^/]+-[\w-]{8,}\.(css|js)$/.test(relativePath)
      || /^photos\/optimized\/[^/]+-[a-f0-9]{12}\.webp$/.test(relativePath)) {
    headers["Cache-Control"] = "public, max-age=31536000, immutable";
  } else if (/\.(png|jpe?g|webp|gif|svg|ico|woff2?)$/i.test(filePath)) {
    headers["Cache-Control"] = "public, max-age=3600";
  }
  const ifNoneMatch = req.headers['if-none-match'];
  const unchanged = ifNoneMatch
    ? ifNoneMatch.split(',').some((value) => value.trim() === '*' || value.trim().replace(/^W\//, '') === etag.replace(/^W\//, ''))
    : req.headers['if-modified-since'] && Math.floor(stat.mtimeMs / 1000) <= Date.parse(req.headers['if-modified-since']) / 1000;
  if ((req.method === 'GET' || req.method === 'HEAD') && unchanged) {
    res.writeHead(304, headers);
    res.end();
    return;
  }
  headers['Content-Length'] = stat.size;
  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
}

async function serveSpa(req, res, pathname) {
  const indexPath = path.join(PUBLIC, "index.html");
  const store = await loadSeoStore(req);
  const html = renderSeoPage(fs.readFileSync(indexPath, "utf8"), pathname, store);
  const body = Buffer.from(html);
  const seo = SEO_PAGES[pathname] || SEO_PAGES["/"];
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": body.length,
    "Cache-Control": "no-cache",
  };
  if (!seo.index) headers["X-Robots-Tag"] = "noindex, nofollow";
  res.writeHead(200, headers);
  if (req.method === "HEAD") res.end();
  else res.end(body);
}

function safeNext(value, fallback = "/account") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}

function legacyDestination(pathname) {
  if (pathname.includes("reservation") || pathname === "/action/reservation") return "/booking";
  if (pathname.includes("mine") || pathname.includes("account")) return "/account";
  return "/";
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
    const token = tokenFrom(req);

    // 旧 H5 / PC 演示系统已下线，保留永久跳转避免历史链接成为 404。
    if (
      pathname === "/app" ||
      pathname.startsWith("/app/h5") ||
      pathname.startsWith("/app/pc") ||
      pathname.startsWith("/action/")
    ) {
      redirect(res, legacyDestination(pathname), 301);
      return;
    }

    if (req.method === "POST" && pathname === "/auth/login") {
      const body = await parseBody(req);
      const result = await callBackend("/auth/login", {
        method: "POST",
        request: req,
        body: {
          account: body.account,
          password: body.password,
          captchaToken: body.captchaToken,
          captchaId: body.captchaId,
          captchaText: body.captchaText,
        },
      });
      if (result.status === 200 || result.status === 201) {
        setToken(req, res, result.data.accessToken);
        if (req.headers["content-type"]?.includes("application/json")) {
          sendJson(res, 200, { userId: result.data.userId });
        } else {
          redirect(res, safeNext(body.next, "/account"));
        }
        return;
      }
      if (req.headers["content-type"]?.includes("application/json")) {
        sendJson(res, result.status, result.data);
      } else {
        redirect(res, `/admin?error=${encodeURIComponent(result.data?.message || "登录失败")}`);
      }
      return;
    }

    if (req.method === "POST" && pathname === "/auth/register") {
      const body = await parseBody(req);
      const result = await callBackend("/auth/register", {
        method: "POST",
        request: req,
        body: {
          username: body.username,
          email: body.email,
          emailCode: body.emailCode,
          password: body.password,
        },
      });
      if (result.status === 200 || result.status === 201) {
        setToken(req, res, result.data.accessToken);
        if (req.headers["content-type"]?.includes("application/json")) {
          sendJson(res, 200, { userId: result.data.userId });
        } else {
          redirect(res, safeNext(body.next, "/account"));
        }
        return;
      }
      sendJson(res, result.status, result.data);
      return;
    }

    if ((req.method === "POST" || req.method === "GET") && pathname === "/auth/logout") {
      clearToken(req, res);
      if (req.method === "POST") sendJson(res, 200, { loggedOut: true });
      else redirect(res, "/");
      return;
    }

    if (pathname.startsWith("/api/")) {
      const apiPath = pathname.slice(4) + url.search;
      if (req.headers["content-type"]?.includes("multipart/form-data")) {
        await proxyRaw(req, res, `${BACKEND}/api${apiPath}`, token);
        return;
      }
      let body;
      if (req.method !== "GET" && req.method !== "HEAD") body = await parseBody(req);
      const result = await callBackend(apiPath, { method: req.method, token, body, request: req });
      sendJson(res, result.status, result.data);
      return;
    }

    if (pathname.startsWith("/uploads/") || pathname.startsWith("/assets/demo/") || pathname.startsWith("/assets/music/")) {
      await proxyRaw(req, res, `${BACKEND}${pathname}${url.search}`, token);
      return;
    }

    if (pathname === "/admin") pathname = "/admin/index.html";
    const filePath = resolveFile(pathname);
    if (filePath) {
      serveFile(req, res, filePath);
      return;
    }

    if (SPA_ROUTES.has(pathname)) {
      await serveSpa(req, res, pathname);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
  } catch (error) {
    console.error("request failed", error);
    if (!res.headersSent) sendJson(res, 500, { message: "服务暂时不可用，请稍后再试" });
    else res.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`IDOL BEADS Web 已启动：http://${HOST}:${PORT}`);
  console.log(`后端接口：${BACKEND}/api`);
});
