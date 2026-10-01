import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "public");
const PORT = Number(process.env.PORT) || 4173;
// 监听地址：本地开发默认 127.0.0.1；容器内需设为 0.0.0.0 才能被外部/其他容器访问
const HOST = process.env.HOST || "127.0.0.1";
// 拼豆预约后端（DIY NestJS 服务）
const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:3000";
const STORE_ID = Number(process.env.STORE_ID) || 1;
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

const SEAT_STATUS = {
  idle: { cls: "idle", text: "空闲" },
  reserved: { cls: "reserved", text: "已预约" },
  using: { cls: "using", text: "使用中" },
};

const APPT_STATUS = {
  pending: { text: "待确认", tone: "orange" },
  booked: { text: "已预约", tone: "blue" },
  checked_in: { text: "已核销", tone: "green" },
  in_service: { text: "服务中", tone: "orange" },
  completed: { text: "已完成", tone: "green" },
  cancelled: { text: "已取消", tone: "red" },
};

// ---------- 后端调用 ----------
async function callBackend(pathname, { method = "GET", token, body } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${BACKEND}/api${pathname}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

// ---------- cookie ----------
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function tokenFrom(req) {
  return parseCookies(req)[TOKEN_COOKIE] || null;
}

function setToken(res, token) {
  res.setHeader(
    "Set-Cookie",
    `${TOKEN_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
  );
}

function clearToken(res) {
  res.setHeader(
    "Set-Cookie",
    `${TOKEN_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
  );
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function todayStr() {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" })
  );
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (req.headers["content-type"]?.includes("application/json")) {
        try {
          return resolve(JSON.parse(raw || "{}"));
        } catch {
          return resolve({});
        }
      }
      const params = new URLSearchParams(raw);
      const obj = {};
      for (const [k, v] of params) obj[k] = v;
      resolve(obj);
    });
    req.on("error", reject);
  });
}

// ---------- 后端数据 + 模板渲染 ----------
async function loadStore() {
  const { status, data } = await callBackend(`/stores/${STORE_ID}`);
  if (status !== 200) return null;
  return data;
}

async function loadAvailability(date) {
  const { status, data } = await callBackend(
    `/appointments/availability?storeId=${STORE_ID}&date=${date}`
  );
  if (status !== 200) return [];
  return data;
}

function seatStatusClass(windows) {
  if (!windows?.length) return "idle";
  if (windows.some((w) => w.status === "in_service" || w.status === "checked_in"))
    return "using";
  return "reserved";
}

async function renderSeatGrid(back) {
  const [store, availability] = await Promise.all([
    loadStore(),
    loadAvailability(todayStr()),
  ]);
  const tables = store?.tables ?? [];
  if (!tables.length) {
    return `<div class="visual-seat-grid"><p class="seat-empty">未找到门店桌位数据</p></div>`;
  }
  const byId = new Map(availability.map((t) => [t.id, t]));
  const items = tables
    .map((t) => {
      const status = seatStatusClass(byId.get(t.id)?.bookedWindows);
      const st = SEAT_STATUS[status];
      return `                    <a class="visual-seat ${st.cls}" href="/action/reservation?back=${back}&amp;table_id=${t.id}">
                        <strong>${esc(t.name)}</strong>
                        <span>${st.text}</span>
                    </a>`;
    })
    .join("\n");
  return `<div class="visual-seat-grid">
${items}
                </div>`;
}

async function renderReservations(token) {
  if (!token) {
    return `<div class="visual-list">
                    <div class="seat-empty">请先<a href="/login">登录</a>后查看我的预约。</div>
                </div>`;
  }
  const { status, data } = await callBackend("/appointments", { token });
  if (status !== 200) {
    return `<div class="visual-list">
                    <div class="seat-empty">预约列表加载失败，请<a href="/login">重新登录</a>。</div>
                </div>`;
  }
  const items = data.items ?? [];
  if (!items.length) {
    return `<div class="visual-list">
                    <div class="seat-empty">暂无预约记录。</div>
                </div>`;
  }
  const html = items
    .map((a) => {
      const st = APPT_STATUS[a.status] || { text: a.status, tone: "blue" };
      const table = a.tables?.length ? a.tables.map((t) => t.name).join("、") : a.tableName;
      return `                    <article>
                        <div class="item-avatar">拼</div>
                        <div>
                            <strong>${esc(table || a.storeName)}</strong>
                            <span>${esc(a.date)} ${esc(a.startTime)}-${esc(a.endTime)} · ${a.peopleCount}人 · 码 ${esc(a.code)}</span>
                        </div>
                        <em class="badge tone-${st.tone}">${st.text}</em>
                    </article>`;
    })
    .join("\n");
  return `<div class="visual-list">
${html}
                </div>`;
}

async function renderTableOptions(selectedId) {
  const store = await loadStore();
  const tables = store?.tables ?? [];
  return tables
    .map(
      (t) =>
        `<option value="${t.id}"${String(t.id) === String(selectedId) ? " selected" : ""}>${esc(t.name)}（${t.capacity}人）</option>`
    )
    .join("");
}

async function renderSlotOptions() {
  const store = await loadStore();
  const slots = store?.slots ?? [];
  return slots
    .map((s) => `<option value="${esc(s.startTime)}">${esc(s.startTime)} 开始</option>`)
    .join("");
}

// 金额格式化：9.9 -> ￥9.9，54.89 -> ￥54.89，45 -> ￥45
function fmtPrice(n) {
  if (n == null || n === "" || Number.isNaN(Number(n))) return "—";
  return "$" + Number(n).toFixed(2).replace(/\.?0+$/, "");
}

// 价位表：时长 × 单人/会员/多人同行
function renderPricing(store) {
  if (!store) {
    return `<div class="price-tables"><p class="seat-empty">未找到门店价格数据</p></div>`;
  }

  const pkg =
    (store.packages || []).find((p) => Number(p.hours) === 6) ??
    (store.packages || [])[0];

  const rows = [
    [
      "1 小时 1HR Session",
      fmtPrice(store.price),
      fmtPrice(store.memberPrice),
      fmtPrice(store.groupPrice),
      false,
    ],
    [
      "6 小时 6HR Session",
      fmtPrice(pkg?.price),
      fmtPrice(pkg?.memberPrice),
      fmtPrice(pkg?.groupPrice),
      false,
    ],
    [
      "全天不限时 Full-Day Pass",
      fmtPrice(store.allDayPrice),
      fmtPrice(store.allDayMemberPrice),
      fmtPrice(store.allDayGroupPrice),
      true,
    ],
  ];

  const body = rows
    .map(
      ([d, solo, member, group, star]) =>
        `<tr><td>${esc(d)}</td><td>${solo}</td><td>${member}${
          star ? ' <span class="price-star">⭐</span>' : ""
        }</td><td>${group}</td></tr>`
    )
    .join("");

  return `<div class="price-tables">
        <div class="price-card pricing-full">
            <div class="card-header">
                <span class="card-title-icon">💰</span>
                <h3>价位表 · Pricing</h3>
            </div>
            <table class="price-table">
                <thead><tr><th>时长 Duration</th><th>单人 Single</th><th>会员 Member (20% OFF)</th><th>多人同行 2+ PAX (10% OFF)</th></tr></thead>
                <tbody>${body}</tbody>
            </table>
        </div>
    </div>`;
}

function renderNotice(query) {
  if (query.booked) {
    return `<section class="notice notice-ok">预约成功，预约码：<b>${esc(query.booked)}</b></section>`;
  }
  if (query.error) {
    return `<section class="notice notice-err">${esc(query.error)}</section>`;
  }
  return "";
}

function renderAuth(token) {
  if (token) return `<a class="auth-link" href="/auth/logout">退出登录</a>`;
  return `<a class="auth-link" href="/login">登录</a>`;
}

async function render(html, { back, token, query } = {}) {
  let out = html;
  const seatBack = back || "/app/h5/home";
  // 顺序渲染：先 notice，再 seats / reservations / 表单项
  out = out.replace(/<!--@notice-->/g, renderNotice(query || {}));
  out = out.replace(/<!--@auth-->/g, renderAuth(token));
  out = out.replace(/<!--@today-->/g, todayStr());
  out = out.replace(/<!--@storeid-->/g, String(STORE_ID));
  const seatMatch = out.match(/<!--@seats:([^>]*)-->/);
  if (seatMatch) {
    out = out.replace(
      /<!--@seats:([^>]*)-->/,
      await renderSeatGrid(seatMatch[1] || seatBack)
    );
  }
  if (out.includes("<!--@reservations-->")) {
    out = out.replace(/<!--@reservations-->/g, await renderReservations(token));
  }
  if (out.includes("<!--@tables-->")) {
    out = out.replace(
      /<!--@tables-->/g,
      await renderTableOptions(query?.table_id)
    );
  }
  if (out.includes("<!--@slots-->")) {
    out = out.replace(/<!--@slots-->/g, await renderSlotOptions());
  }
  // 门店信息/价格（复刻落地页 + /app/* 价位表共用真实门店数据）
  const storePlaceholders = [
    "<!--@pricing-->",
    "<!--@store-name-->",
    "<!--@store-address-->",
    "<!--@store-hours-->",
    "<!--@store-phone-->",
    "<!--@price-solo-->",
    "<!--@price-group-->",
    "<!--@price-daypass-wd-->",
    "<!--@price-daypass-we-->",
  ];
  if (storePlaceholders.some((p) => out.includes(p))) {
    const store = await loadStore();
    const replaceAll = (k, v) => {
      out = out.split(k).join(v ?? "");
    };
    replaceAll("<!--@store-name-->", esc(store?.name ?? ""));
    replaceAll("<!--@store-address-->", esc(store?.address ?? ""));
    replaceAll("<!--@store-hours-->", esc(store?.businessHours ?? ""));
    replaceAll("<!--@store-phone-->", esc(store?.phone ?? ""));
    replaceAll("<!--@price-solo-->", fmtPrice(store?.price));
    replaceAll("<!--@price-group-->", fmtPrice(store?.groupPrice ?? store?.price));
    replaceAll("<!--@price-daypass-wd-->", fmtPrice(store?.allDayPrice));
    const surcharge = Number(store?.weekendSurchargePercent) || 0;
    const weekend =
      store?.allDayPrice != null
        ? Number(store.allDayPrice) * (1 + surcharge / 100)
        : null;
    replaceAll("<!--@price-daypass-we-->", fmtPrice(weekend));
    if (out.includes("<!--@pricing-->")) {
      out = out.split("<!--@pricing-->").join(renderPricing(store));
    }
  }
  out = out.replace(/<!--@back-->/g, back || "/app/h5/home");
  return out;
}

// ---------- 静态文件 ----------
function resolveFile(pathname) {
  const direct = path.join(PUBLIC, pathname);
  const candidates = [direct];
  if (!path.extname(pathname)) candidates.push(direct + ".html");
  for (const c of candidates) {
    if (!c.startsWith(PUBLIC + path.sep) && c !== PUBLIC) continue;
    try {
      if (fs.statSync(c).isFile()) return c;
    } catch {
      /* keep looking */
    }
  }
  return null;
}

function safeBack(pathname, url) {
  const raw = url.searchParams.get("back") || "";
  if (typeof raw === "string" && /^\/[A-Za-z0-9_\-/]*$/.test(raw)) return raw;
  if (pathname.startsWith("/app/pc")) return "/app/pc/home";
  return "/app/h5/home";
}

// ---------- 登录 / 注册页面 ----------
function authPage(kind, next) {
  const isLogin = kind === "login";
  const safeNext =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/app/h5/reservation";
  const title = isLogin ? "登录" : "注册";
  const action = `/auth/${kind}`;
  const fields = isLogin
    ? `<label class="field"><span>账号（用户名 / 邮箱）</span><input name="account" placeholder="reviewdemo" required></label>
       <label class="field"><span>密码</span><input name="password" type="password" placeholder="请输入密码" required></label>`
    : `<label class="field"><span>用户名</span><input name="username" placeholder="2-30 位字母数字下划线" required></label>
       <label class="field"><span>邮箱</span><input name="email" type="email" placeholder="you@example.com" required></label>
       <label class="field"><span>密码</span><input name="password" type="password" placeholder="至少 6 位" required></label>`;
  const other = isLogin
    ? `<a href="/register">没有账号？去注册</a>`
    : `<a href="/login">已有账号？去登录</a>`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${title} - 拼豆系统</title>
  <link rel="stylesheet" href="/resources/assets/css/app.css?v=0.4.1">
</head>
<body class="theme-cyan terminal-page">
  <section class="form-runtime">
    <main class="operation-form">
      <header class="operation-head">
        <a href="/app/h5/home">返回</a>
        <div><span>拼豆系统</span><h1>${title}</h1><p>预约订座需要先登录。</p></div>
      </header>
      <section class="panel-card">
        <form method="post" action="${action}" class="visual-form">
          <input type="hidden" name="next" value="${safeNext}">
          <div class="form-grid">
${fields}
          </div>
          <div class="form-actions">
            <button type="submit">${title}</button>
            ${other}
          </div>
        </form>
      </section>
    </main>
  </section>
  <script src="/resources/assets/js/app.js?v=0.4.1"></script>
</body>
</html>`;
}

// ---------- 服务器 ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(url.pathname);
  const token = tokenFrom(req);

  // 根路径：beads.land 复刻落地页
  if (pathname === "/") {
    pathname = "/index.html";
  }
  if (pathname === "/app/pc" || pathname === "/app/pc/") {
    redirect(res, "/app/pc/home");
    return;
  }
  if (pathname === "/app/h5" || pathname === "/app/h5/") {
    redirect(res, "/app/h5/home");
    return;
  }

  // 登录 / 注册 / 登出
  if (req.method === "POST" && pathname === "/auth/login") {
    const b = await parseBody(req);
    const r = await callBackend("/auth/login", {
      method: "POST",
      body: { account: b.account, password: b.password },
    });
    if (r.status === 201 || r.status === 200) {
      setToken(res, r.data.accessToken);
      redirect(res, b.next || "/app/h5/reservation");
      return;
    }
    redirect(res, `/login?error=${encodeURIComponent(r.data?.message || "登录失败")}`);
    return;
  }
  if (req.method === "POST" && pathname === "/auth/register") {
    const b = await parseBody(req);
    const r = await callBackend("/auth/register", {
      method: "POST",
      body: { username: b.username, email: b.email, password: b.password },
    });
    if (r.status === 201 || r.status === 200) {
      setToken(res, r.data.accessToken);
      redirect(res, b.next || "/app/h5/reservation");
      return;
    }
    redirect(
      res,
      `/register?error=${encodeURIComponent(r.data?.message || "注册失败")}`
    );
    return;
  }
  if (pathname === "/auth/logout") {
    clearToken(res);
    redirect(res, "/app/h5/home");
    return;
  }
  if (req.method === "GET" && pathname === "/login") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(authPage("login", url.searchParams.get("next")));
    return;
  }
  if (req.method === "GET" && pathname === "/register") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(authPage("register", url.searchParams.get("next")));
    return;
  }

  // 预约提交（表单 → 后端 DTO）
  if (req.method === "POST" && pathname === "/book") {
    const b = await parseBody(req);
    const back = b.back || "/app/h5/reservation";
    if (!token) {
      redirect(res, `/login?next=${encodeURIComponent(back)}`);
      return;
    }
    const dto = {
      storeId: Number(b.storeId) || STORE_ID,
      tableId: Number(b.tableId),
      date: b.date,
      startTime: b.startTime,
      durationHours: Number(b.durationHours) || 1,
      peopleCount: Number(b.peopleCount) || 1,
      payMethod: b.payMethod || "wechat",
    };
    const r = await callBackend("/appointments", {
      method: "POST",
      token,
      body: dto,
    });
    if (r.status === 201 || r.status === 200) {
      redirect(res, `${back}?booked=${encodeURIComponent(r.data.code)}`);
      return;
    }
    redirect(res, `${back}?error=${encodeURIComponent(r.data?.message || "预约失败")}`);
    return;
  }

  // 核销（预约码）
  if (req.method === "POST" && pathname === "/verify") {
    const b = await parseBody(req);
    const back = b.back || "/app/h5/verify";
    if (!token) {
      redirect(res, `/login?next=${encodeURIComponent(back)}`);
      return;
    }
    const r = await callBackend("/appointments/checkin", {
      method: "POST",
      token,
      body: { code: b.code },
    });
    if (r.status === 201 || r.status === 200) {
      redirect(res, `${back}?booked=${encodeURIComponent("核销成功")}`);
      return;
    }
    redirect(res, `${back}?error=${encodeURIComponent(r.data?.message || "核销失败")}`);
    return;
  }

  // 通用 /api/* 代理（带登录态）
  if (pathname.startsWith("/api/")) {
    const apiPath = pathname.slice(4) + url.search; // 去掉 /api 前缀，并保留查询串
    let body;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const raw = await new Promise((resolve) => {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      });
      try {
        body = JSON.parse(raw || "{}");
      } catch {
        body = undefined;
      }
    }
    const r = await callBackend(apiPath, { method: req.method, token, body });
    res.writeHead(r.status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(typeof r.data === "string" ? r.data : JSON.stringify(r.data));
    return;
  }

  if (pathname !== "/" && pathname.endsWith("/")) pathname = pathname.slice(0, -1);

  const filePath = resolveFile(pathname);
  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
    return;
  }

  const ext = path.extname(filePath);
  const type = MIME[ext] || "application/octet-stream";
  let data = fs.readFileSync(filePath);
  if (ext === ".html") {
    const back = safeBack(pathname, url);
    const query = Object.fromEntries(url.searchParams.entries());
    data = Buffer.from(await render(data.toString("utf8"), { back, token, query }));
  }
  res.writeHead(200, { "Content-Type": type });
  res.end(data);
});

server.listen(PORT, HOST, () => {
  console.log(`拼豆预约已启动：http://${HOST === "0.0.0.0" ? "0.0.0.0" : "127.0.0.1"}:${PORT}/`);
  console.log(`对接后端：${BACKEND}/api（门店 ID ${STORE_ID}）`);
});
