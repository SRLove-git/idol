# 拼豆系统 · 预约订座（拼豆预约）前端 + DIY 后端对接

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

打开 <http://127.0.0.1:4173/>（`/` 跳 PC 首页，H5 在 `/app/h5/home`）。

可用账号：`reviewdemo` / `ThinkOrigin#2026`（审核演示账号，已预置 IDOL BEADS 门店）。

## 端点映射

| 前端流程 | 后端接口 |
| --- | --- |
| 座位状态（桌位平面图） | `GET /api/stores/1` + `GET /api/appointments/availability?storeId=1&date=…` |
| 创建预约 | `POST /api/appointments`（storeId / tableId / date / startTime / durationHours / peopleCount / payMethod） |
| 我的预约 | `GET /api/appointments` |
| 核销（预约码） | `POST /api/appointments/checkin` |
| 登录 / 注册 | `POST /api/auth/login` / `POST /api/auth/register` |

`server.mjs` 负责：静态页面服务、登录态 Cookie、`/api/*` 反向代理到后端、以及把后端门店/桌位/预约数据渲染进页面的 `<!--@seats-->` / `<!--@reservations-->` / `<!--@tables-->` / `<!--@slots-->` 占位。

## 说明 / 缺口

- 预约、核销、取消（`POST /api/appointments/:id/cancel`）、我的预约均已走真实后端，含冲突/人数/日期校验与错误回显。
- 「买水服务」在后端无对应商品/加购订单接口，暂未对接。
- 「座位管理 / 修改座位」属于管理端（需 admin 角色 + `admin/appointments`），本次未接入前端演示账号。

## 包含页面

- `/app/pc/home` PC 首页（预约订座入口 + 座位状态）
- `/app/pc/reservation` PC 预约订座（新建预约、座位平面图、预约记录、预约核销流程）
- `/action/reservation` 创建预约表单
- `/action/seat` 修改座位表单
- `/action/water-order` 生成买水订单表单

## 说明

- 页面结构与样式来自原站 `app.css` / `app.js`，未做改动，保证视觉一致。
- 原站后端为 PHP，本克隆用内存态模拟了 `POST /api/create/reservation`、`/api/patch/seat`、`/api/create/water-order`，创建预约/修改座位后返回列表即可看到最新记录（刷新后重置）。
- 未在本次范围内的模块（智能拼豆、社交作品、交易市场、拍卖专区、我的）会显示占位页；H5 端已移除。
