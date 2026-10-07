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

const MIME = {
  ".html": "text/html; charset=utf-8",
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

const SPA_ROUTES = new Set(["/", "/booking", "/login", "/register", "/account"]);

async function callBackend(pathname, { method = "GET", token, body } = {}) {
  const headers = {};
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

function setToken(res, token) {
  res.setHeader(
    "Set-Cookie",
    `${TOKEN_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
  );
}

function clearToken(res) {
  res.setHeader(
    "Set-Cookie",
    `${TOKEN_COOKIE}=; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=0`,
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

function serveFile(res, filePath) {
  const ext = path.extname(filePath);
  const headers = { "Content-Type": MIME[ext] || "application/octet-stream" };
  if (filePath.endsWith("index.html")) {
    headers["Cache-Control"] = "no-cache";
  } else if (/\.[a-f0-9]{8}\.(css|js)$/i.test(filePath)) {
    headers["Cache-Control"] = "public, max-age=31536000, immutable";
  }
  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
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
        body: { account: body.account, password: body.password },
      });
      if (result.status === 200 || result.status === 201) {
        setToken(res, result.data.accessToken);
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
        body: {
          username: body.username,
          email: body.email,
          emailCode: body.emailCode,
          password: body.password,
        },
      });
      if (result.status === 200 || result.status === 201) {
        setToken(res, result.data.accessToken);
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
      clearToken(res);
      if (req.method === "POST") sendJson(res, 200, { loggedOut: true });
      else redirect(res, "/");
      return;
    }

    if (pathname.startsWith("/api/")) {
      const apiPath = pathname.slice(4) + url.search;
      let body;
      if (req.method !== "GET" && req.method !== "HEAD") body = await parseBody(req);
      const result = await callBackend(apiPath, { method: req.method, token, body });
      sendJson(res, result.status, result.data);
      return;
    }

    if (pathname === "/admin") pathname = "/admin/index.html";
    const filePath = resolveFile(pathname);
    if (filePath) {
      serveFile(res, filePath);
      return;
    }

    if (SPA_ROUTES.has(pathname)) {
      serveFile(res, path.join(PUBLIC, "index.html"));
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
