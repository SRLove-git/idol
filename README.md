# IDOL BEADS 官网、预约与会员系统

前端复刻自 `http://47.94.97.161:1333/` 的「拼豆预约 / 预约订座」界面，现已对接真实的 DIY NestJS 后端（`/Users/srlove/Documents/Code/diy/server`）。

## 运行

后端（DIY NestJS）需先运行在 `http://127.0.0.1:3000`：

```bash
cd /Users/srlove/Documents/Code/diy/server
CAPTCHA_PROVIDER= REVIEW_DEMO_ENABLED=true npm run start:dev
```

再启动前端（本目录）：

```bash
npm run dev
```

打开 <http://127.0.0.1:4173/>。桌面端和移动端共用同一套响应式官网，不再维护单独的 H5 页面。

管理后台在 <http://127.0.0.1:4173/admin>，生产环境需在 `.env` 配置
`ADMIN_INITIAL_PASSWORD`，首次启动会创建 `ADMIN_USERNAME`（默认 `admin`）超级管理员。
后台已接入数据看板、预约处理、门店价格、会员套餐/开通申请与用户管理。

可用账号：`reviewdemo` / `ThinkOrigin#2026`（审核演示账号，已预置 IDOL BEADS 门店）。

## 端点映射

| 前端流程 | 后端接口 |
| --- | --- |
| 座位状态（桌位平面图） | `GET /api/stores/1` + `GET /api/appointments/availability?storeId=1&date=…` |
| 创建预约 | `POST /api/appointments`（storeId / tableId / date / startTime / durationHours / peopleCount / payMethod） |
| 我的预约 | `GET /api/appointments` |
| 核销（预约码） | `POST /api/appointments/checkin` |
| 登录 / 注册 | `POST /api/auth/login` / `POST /api/auth/register` |

`server.mjs` 负责：静态页面与 SPA 路由、登录态 Cookie、`/api/*` 反向代理，以及旧 H5/PC 地址到新页面的永久跳转。

## 说明 / 缺口

- 预约、核销、取消（`POST /api/appointments/:id/cancel`）、我的预约均已走真实后端，含冲突/人数/日期校验与错误回显。
- 「买水服务」在后端无对应商品/加购订单接口，暂未对接。
- 「座位管理 / 修改座位」属于管理端（需 admin 角色 + `admin/appointments`），本次未接入前端演示账号。

## 包含页面

- `/` 统一官网首页
- `/booking` 免登录预约（直接填写邮箱，已有账号自动绑定）
- `/login` 登录
- `/register` 邮箱验证码注册
- `/account` 会员资料与我的预约
- `/admin` 管理后台

旧的 `/app/h5/*`、`/app/pc/*` 和 `/action/*` 地址不再包含独立页面，会永久跳转到对应的新页面。
