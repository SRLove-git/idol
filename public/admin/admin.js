const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]

const state = { me: null, page: 'dashboard', stores: [], confirmAction: null }
const pageMeta = {
  dashboard: ['OVERVIEW', '数据看板'],
  appointments: ['RESERVATIONS', '预约管理'],
  pricing: ['STORE & PRICING', '门店与价格'],
  members: ['MEMBERSHIP', '会员管理'],
  users: ['CUSTOMERS', '用户管理'],
  security: ['SECURITY', '账号安全']
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char])
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (options.body && typeof options.body !== 'string') {
    headers['content-type'] = 'application/json'
    options.body = JSON.stringify(options.body)
  }
  const response = await fetch(`/api${path}`, { ...options, headers, credentials: 'same-origin' })
  const text = await response.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  if (!response.ok) {
    const error = new Error(Array.isArray(data?.message) ? data.message.join('；') : data?.message || `请求失败 (${response.status})`)
    error.status = response.status
    throw error
  }
  return data
}

function toast(message, error = false) {
  const el = $('#toast')
  el.textContent = message
  el.className = `toast${error ? ' is-error' : ''}`
  el.hidden = false
  clearTimeout(toast.timer)
  toast.timer = setTimeout(() => { el.hidden = true }, 3000)
}

function loading() {
  $('#page-content').innerHTML = '<div class="loading"><i></i><span>正在读取数据…</span></div>'
}

function showError(error) {
  if (error.status === 401) return showLogin('登录已过期，请重新登录')
  $('#page-content').innerHTML = `<div class="panel empty">加载失败：${esc(error.message)}</div>`
}

function showLogin(message = '') {
  $('#admin-app').hidden = true
  $('#login-view').hidden = false
  const queryMessage = new URLSearchParams(location.search).get('error')
  const error = message || queryMessage
  if (error) { $('#login-error').textContent = error; $('#login-error').hidden = false }
}

function applyPermissions() {
  const elevated = state.me.adminRole === 'super_admin' || state.me.adminRole === 'operator'
  $$('[data-role="operator"]').forEach((el) => { el.hidden = !elevated })
}

async function init() {
  try {
    state.me = await api('/auth/me')
    if (state.me.role !== 'admin') return showLogin('当前账号不是管理员')
    $('#login-view').hidden = true
    $('#admin-app').hidden = false
    $('#admin-name').textContent = state.me.nickname || state.me.username || '管理员'
    $('#admin-role').textContent = state.me.adminRole || 'admin'
    $('#admin-avatar').textContent = (state.me.nickname || state.me.username || 'A').slice(0, 1).toUpperCase()
    applyPermissions()
    await Promise.all([navigate('dashboard'), refreshPending()])
  } catch (error) {
    showLogin(error.status === 401 ? '' : error.message)
  }
}

async function refreshPending() {
  try {
    const data = await api('/admin/dashboard/pending-summary')
    setBadge('#pending-appt', data.pendingAppointments)
    setBadge('#pending-member', data.pendingMemberOrders)
  } catch { /* role may not have access */ }
}

function setBadge(selector, count) {
  const el = $(selector)
  el.textContent = count || ''
  el.hidden = !count
}

async function navigate(page) {
  state.page = page
  $$('.sidebar-nav button').forEach((button) => button.classList.toggle('is-active', button.dataset.page === page))
  const [kicker, title] = pageMeta[page]
  $('#page-kicker').textContent = kicker
  $('#page-title').textContent = title
  document.body.classList.remove('menu-open')
  loading()
  try {
    if (page === 'dashboard') await renderDashboard()
    if (page === 'appointments') await renderAppointments()
    if (page === 'pricing') await renderPricing()
    if (page === 'members') await renderMembers()
    if (page === 'users') await renderUsers()
    if (page === 'security') renderSecurity()
  } catch (error) { showError(error) }
}

async function renderDashboard() {
  const [overview, trends, pending] = await Promise.all([
    api('/admin/dashboard/overview'), api('/admin/dashboard/trends'), api('/admin/dashboard/pending-summary')
  ])
  const max = Math.max(1, ...trends.map((item) => item.appointments))
  $('#page-content').innerHTML = `
    <div class="stats-grid">
      ${statCard('总用户', overview.users.total, `今日 +${overview.users.today}`, '#eef4ff')}
      ${statCard('预约订单', overview.appointments.total, `今日 +${overview.appointments.today}`, '#fff1f4')}
      ${statCard('服务中', overview.appointments.inService, `已核销 ${overview.appointments.checkedIn}`, '#eaf7f3')}
      ${statCard('社区作品', overview.community.totalPosts, `今日 +${overview.community.todayPosts}`, '#fff5e8')}
    </div>
    <div class="dashboard-grid">
      <section class="panel"><div class="panel-head"><div><h2>近 7 天预约趋势</h2><p>按创建日期统计</p></div></div>
        <div class="trend-chart">${trends.map((item) => `<div class="trend-day"><div class="trend-bar" style="height:${Math.max(4, item.appointments / max * 180)}px" title="${item.appointments} 笔"></div><b>${item.appointments}</b><span>${item.date.slice(5)}</span></div>`).join('')}</div>
      </section>
      <section class="panel"><div class="panel-head"><div><h2>待处理事项</h2><p>需要及时处理的业务</p></div></div>
        <div class="task-list">
          ${taskItem('待确认预约', pending.pendingAppointments, 'appointments')}
          ${taskItem('会员开通申请', pending.pendingMemberOrders, 'members')}
          ${taskItem('待审核帖子', pending.pendingPosts)}
          ${taskItem('待审核视频', pending.pendingVideos)}
        </div>
      </section>
    </div>`
  $$('[data-jump]').forEach((el) => el.addEventListener('click', () => navigate(el.dataset.jump)))
}

function statCard(label, value, note, tone) {
  return `<article class="stat-card" style="--tone:${tone}"><span>${label}</span><strong>${Number(value || 0).toLocaleString()}</strong><small>${note}</small></article>`
}
function taskItem(label, value, page = '') {
  return `<div class="task-item"${page ? ` data-jump="${page}" role="button" tabindex="0"` : ''}><span>${label}</span><b>${value || 0}</b></div>`
}

async function renderAppointments(filters = {}) {
  const params = new URLSearchParams({ limit: '50', ...filters })
  Object.keys(filters).forEach((key) => { if (!filters[key]) params.delete(key) })
  const data = await api(`/admin/appointments?${params}`)
  const [items, total] = Array.isArray(data) ? data : [[], 0]
  $('#page-content').innerHTML = `
    <form id="appointment-filter" class="toolbar">
      <input class="grow" name="keyword" value="${esc(filters.keyword)}" placeholder="搜索邮箱、昵称或用户名">
      <input name="date" type="date" value="${esc(filters.date)}">
      <select name="status"><option value="">全部状态</option>${['pending','booked','checked_in','in_service','completed','cancelled'].map((value) => `<option value="${value}"${filters.status === value ? ' selected' : ''}>${statusText(value)}</option>`).join('')}</select>
      <button class="button" type="submit">查询</button>
    </form>
    <div class="panel-head"><div><h2>预约列表</h2><p>共 ${total} 笔记录</p></div><button id="refresh-appointments" class="button button-ghost">刷新</button></div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>预约码</th><th>客户</th><th>日期 / 时间</th><th>人数</th><th>金额</th><th>状态</th><th>操作</th></tr></thead><tbody>
      ${items.length ? items.map(appointmentRow).join('') : '<tr><td colspan="7" class="empty">暂无预约记录</td></tr>'}
    </tbody></table></div>`
  $('#appointment-filter').addEventListener('submit', (event) => { event.preventDefault(); renderAppointments(Object.fromEntries(new FormData(event.currentTarget))) })
  $('#refresh-appointments').addEventListener('click', () => renderAppointments(filters))
  $$('[data-appt-action]').forEach((button) => button.addEventListener('click', () => appointmentAction(button)))
}

function appointmentRow(item) {
  const actions = []
  if (item.status === 'pending') actions.push(actionButton(item.id, 'confirm', '确认', 'button-green'))
  if (item.status === 'booked') actions.push(actionButton(item.id, 'checkin', '核销', 'button-green'))
  if (item.status === 'checked_in') actions.push(actionButton(item.id, 'clockin', '上钟', 'button-green'))
  if (item.status === 'in_service') actions.push(actionButton(item.id, 'clockout', '下钟', 'button-green'))
  if (['pending','booked','checked_in'].includes(item.status)) actions.push(actionButton(item.id, 'cancel', '取消', 'button-ghost'))
  return `<tr><td><strong>${esc(item.code)}</strong></td><td>${esc(item.userNickname || `用户 #${item.userId}`)}<br><small>${esc(item.userEmail || '')}</small></td><td>${esc(item.date)}<br><small>${esc(item.startTime)} - ${esc(item.endTime)}</small></td><td>${item.peopleCount}</td><td>$${Number(item.amount || 0).toFixed(2)}</td><td><span class="status status-${item.status}">${statusText(item.status)}</span></td><td class="actions">${actions.join('') || '—'}</td></tr>`
}
function actionButton(id, action, label, cls) { return `<button class="button button-small ${cls}" data-appt-action="${action}" data-id="${id}">${label}</button>` }

async function appointmentAction(button) {
  const labels = { confirm: '确认这笔预约', checkin: '核销这笔预约', clockin: '开始计时', clockout: '结束计时', cancel: '取消这笔预约' }
  const ok = await confirmDialog(labels[button.dataset.apptAction] || '确认操作')
  if (!ok) return
  try {
    await api(`/admin/appointments/${button.dataset.id}/${button.dataset.apptAction}`, { method: 'POST' })
    toast('操作成功')
    await Promise.all([renderAppointments(), refreshPending()])
  } catch (error) { toast(error.message, true) }
}

async function renderPricing() {
  const stores = await api('/admin/stores')
  state.stores = stores
  const store = stores[0]
  if (!store) { $('#page-content').innerHTML = '<div class="panel empty">暂无门店</div>'; return }
  const pkg = (store.packages || []).find((item) => Number(item.hours) === 6)
  $('#page-content').innerHTML = `
    <div class="section-grid">
      <section class="panel"><div class="panel-head"><div><h2>门店信息与基础价格</h2><p>修改后同步影响官网展示与预约结算</p></div></div>
        <form id="store-form" class="form-grid" data-id="${store.id}">
          ${field('门店名称', 'name', store.name)}${field('营业时间', 'businessHours', store.businessHours)}${field('周末/节假日加价 %', 'weekendSurchargePercent', store.weekendSurchargePercent, 'number', '0.01')}
          ${field('1 小时单人价', 'price', store.price, 'number', '0.01')}${field('1 小时会员价', 'memberPrice', store.memberPrice, 'number', '0.01')}${field('1 小时多人价', 'groupPrice', store.groupPrice, 'number', '0.01')}
          ${field('全天单人价', 'allDayPrice', store.allDayPrice, 'number', '0.01')}${field('全天会员价', 'allDayMemberPrice', store.allDayMemberPrice, 'number', '0.01')}${field('全天多人价', 'allDayGroupPrice', store.allDayGroupPrice, 'number', '0.01')}
          <label class="field field-wide"><span>门店地址</span><input name="address" value="${esc(store.address)}" required></label>
          <div class="form-actions field-wide"><button class="button" type="submit">保存门店信息</button></div>
        </form>
      </section>
      <section class="panel"><div class="panel-head"><div><h2>6 小时套餐</h2><p>时长套餐独立计价</p></div></div>
        ${pkg ? `<form id="package-form" class="form-grid" data-id="${pkg.id}">${field('套餐名称', 'name', pkg.name)}${field('时长（小时）', 'hours', pkg.hours, 'number', '1')}${field('排序', 'sortOrder', pkg.sortOrder, 'number', '1')}${field('单人价', 'price', pkg.price, 'number', '0.01')}${field('会员价', 'memberPrice', pkg.memberPrice, 'number', '0.01')}${field('多人价', 'groupPrice', pkg.groupPrice, 'number', '0.01')}<div class="form-actions field-wide"><button class="button" type="submit">保存套餐</button></div></form>` : '<div class="empty">未找到 6 小时套餐</div>'}
      </section>
    </div>`
  $('#store-form').addEventListener('submit', saveStore)
  if ($('#package-form')) $('#package-form').addEventListener('submit', savePackage)
}

function field(label, name, value, type = 'text', step = '') {
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}"${step ? ` step="${step}"` : ''} value="${esc(value)}" required></label>`
}
function formObject(form, numeric = []) {
  const data = Object.fromEntries(new FormData(form))
  numeric.forEach((key) => { if (key in data) data[key] = Number(data[key]) })
  return data
}
async function saveStore(event) {
  event.preventDefault()
  try {
    const body = formObject(event.currentTarget, ['price','memberPrice','groupPrice','allDayPrice','allDayMemberPrice','allDayGroupPrice','weekendSurchargePercent'])
    await api(`/admin/stores/${event.currentTarget.dataset.id}`, { method: 'PATCH', body })
    toast('门店信息已更新')
    await renderPricing()
  } catch (error) { toast(error.message, true) }
}
async function savePackage(event) {
  event.preventDefault()
  try {
    const body = formObject(event.currentTarget, ['hours','sortOrder','price','memberPrice','groupPrice'])
    await api(`/admin/stores/packages/${event.currentTarget.dataset.id}`, { method: 'PATCH', body })
    toast('套餐价格已更新')
    await renderPricing()
  } catch (error) { toast(error.message, true) }
}

async function renderMembers() {
  const [plans, ordersData, membershipsData] = await Promise.all([
    api('/admin/members/plans'), api('/admin/members/orders?page=1'), api('/admin/members?page=1')
  ])
  const [orders, orderTotal] = ordersData
  const [memberships, memberTotal] = membershipsData
  $('#page-content').innerHTML = `
    <div class="panel-head"><div><h2>会员套餐</h2><p>管理官网及 App 中的开通套餐</p></div></div>
    <div class="section-grid">${plans.map(planCard).join('')}</div>
    <section class="panel" style="margin-top:16px"><div class="panel-head"><div><h2>开通申请</h2><p>共 ${orderTotal} 笔，待门店收款确认</p></div></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>客户</th><th>套餐</th><th>金额</th><th>申请时间</th><th>状态</th><th>操作</th></tr></thead><tbody>${orders.length ? orders.map(memberOrderRow).join('') : '<tr><td colspan="6" class="empty">暂无开通申请</td></tr>'}</tbody></table></div>
    </section>
    <section class="panel" style="margin-top:16px"><div class="panel-head"><div><h2>已开通会员</h2><p>共 ${memberTotal} 人</p></div></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>会员号</th><th>客户</th><th>等级</th><th>到期时间</th></tr></thead><tbody>${memberships.length ? memberships.map((item) => `<tr><td>${esc(item.memberNo)}</td><td>${esc(item.userNickname || `用户 #${item.userId}`)}<br><small>${esc(item.userEmail || '')}</small></td><td>${esc(item.levelName)}</td><td>${formatDate(item.expireAt)}</td></tr>`).join('') : '<tr><td colspan="4" class="empty">暂无会员</td></tr>'}</tbody></table></div>
    </section>`
  $$('.plan-form').forEach((form) => form.addEventListener('submit', savePlan))
  $$('[data-plan-toggle]').forEach((button) => button.addEventListener('click', () => togglePlan(button)))
  $$('[data-member-action]').forEach((button) => button.addEventListener('click', () => memberOrderAction(button)))
}

function planCard(plan) {
  return `<form class="plan-card plan-form" data-id="${plan.id}"><header><h3>${esc(plan.name)}</h3><span class="status ${plan.enabled ? 'status-active' : 'status-expired'}">${plan.enabled ? '已上架' : '已下架'}</span></header><div class="form-grid">${field('套餐名', 'name', plan.name)}${field('有效天数', 'durationDays', plan.durationDays, 'number', '1')}${field('售价', 'price', plan.price, 'number', '0.01')}${field('原价', 'originalPrice', plan.originalPrice, 'number', '0.01')}<label class="field field-wide"><span>权益（每行一条）</span><textarea name="benefits">${esc((plan.benefits || []).join('\n'))}</textarea></label><input type="hidden" name="badge" value="${esc(plan.badge || '')}"><input type="hidden" name="recommended" value="${plan.recommended ? 'true' : 'false'}"><input type="hidden" name="enabled" value="${plan.enabled ? 'true' : 'false'}"><div class="form-actions field-wide"><button class="button" type="submit">保存</button><button class="button button-ghost" type="button" data-plan-toggle="${plan.enabled ? 'false' : 'true'}" data-id="${plan.id}">${plan.enabled ? '下架' : '上架'}</button></div></div></form>`
}
async function savePlan(event) {
  event.preventDefault()
  const body = formObject(event.currentTarget, ['durationDays','price','originalPrice'])
  body.benefits = body.benefits.split('\n').map((item) => item.trim()).filter(Boolean)
  body.recommended = body.recommended === 'true'
  body.enabled = body.enabled === 'true'
  try { await api(`/admin/members/plans/${event.currentTarget.dataset.id}`, { method: 'PATCH', body }); toast('会员套餐已保存'); await renderMembers() } catch (error) { toast(error.message, true) }
}
async function togglePlan(button) {
  try { await api(`/admin/members/plans/${button.dataset.id}/enabled`, { method: 'PATCH', body: { enabled: button.dataset.planToggle === 'true' } }); toast('套餐状态已更新'); await renderMembers() } catch (error) { toast(error.message, true) }
}
function memberOrderRow(item) {
  return `<tr><td>${esc(item.userNickname || `用户 #${item.userId}`)}<br><small>${esc(item.userEmail || '')}</small></td><td>${esc(item.planName)}</td><td>$${Number(item.amount).toFixed(2)}</td><td>${formatDate(item.createdAt)}</td><td><span class="status status-${item.status}">${statusText(item.status)}</span></td><td class="actions">${item.status === 'pending' ? `<button class="button button-small button-green" data-member-action="confirm" data-id="${item.id}">确认收款</button><button class="button button-small button-ghost" data-member-action="cancel" data-id="${item.id}">取消</button>` : '—'}</td></tr>`
}
async function memberOrderAction(button) {
  if (!await confirmDialog(button.dataset.memberAction === 'confirm' ? '确认已收款并开通会员？' : '取消这笔申请？')) return
  try { await api(`/admin/members/orders/${button.dataset.id}/${button.dataset.memberAction}`, { method: 'POST' }); toast('操作成功'); await Promise.all([renderMembers(), refreshPending()]) } catch (error) { toast(error.message, true) }
}

async function renderUsers(search = '') {
  const data = await api(`/admin/users?page=1${search ? `&search=${encodeURIComponent(search)}` : ''}`)
  const [users, total] = data
  $('#page-content').innerHTML = `
    <form id="user-filter" class="toolbar"><input class="grow" name="search" value="${esc(search)}" placeholder="搜索用户名、邮箱或昵称"><button class="button" type="submit">搜索</button></form>
    <div class="panel-head"><div><h2>用户列表</h2><p>共 ${total} 个账号</p></div></div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>用户</th><th>邮箱</th><th>角色</th><th>注册时间</th><th>状态</th><th>操作</th></tr></thead><tbody>${users.length ? users.map(userRow).join('') : '<tr><td colspan="7" class="empty">未找到用户</td></tr>'}</tbody></table></div>`
  $('#user-filter').addEventListener('submit', (event) => { event.preventDefault(); renderUsers(new FormData(event.currentTarget).get('search').trim()) })
  $$('[data-user-ban]').forEach((button) => button.addEventListener('click', () => banUser(button)))
  $$('[data-user-offline]').forEach((button) => button.addEventListener('click', () => forceOffline(button)))
}
function userRow(user) {
  const isSelf = user.id === state.me.id
  return `<tr><td>#${user.id}</td><td><strong>${esc(user.nickname || user.username || '未命名')}</strong><br><small>@${esc(user.username || '—')}</small></td><td>${esc(user.email || '—')}</td><td>${user.role === 'admin' ? `<span class="status status-booked">${esc(user.adminRole || '管理员')}</span>` : '用户'}</td><td>${formatDate(user.createdAt)}</td><td><span class="status ${user.isBanned ? 'status-banned' : 'status-active'}">${user.isBanned ? '已封禁' : '正常'}</span></td><td class="actions">${isSelf ? '当前账号' : `<button class="button button-small ${user.isBanned ? 'button-green' : 'button-ghost'}" data-user-ban="${user.isBanned ? 'false' : 'true'}" data-id="${user.id}">${user.isBanned ? '解封' : '封禁'}</button><button class="button button-small button-ghost" data-user-offline data-id="${user.id}">强制下线</button>`}</td></tr>`
}
async function banUser(button) {
  const ban = button.dataset.userBan === 'true'
  if (!await confirmDialog(`${ban ? '封禁' : '解封'}该用户？`)) return
  try { await api(`/admin/users/${button.dataset.id}/ban`, { method: 'PATCH', body: { isBanned: ban } }); toast('用户状态已更新'); await renderUsers() } catch (error) { toast(error.message, true) }
}
async function forceOffline(button) {
  if (!await confirmDialog('强制该用户下线？')) return
  try { await api(`/admin/users/${button.dataset.id}/offline`, { method: 'PATCH' }); toast('已强制用户下线') } catch (error) { toast(error.message, true) }
}

function renderSecurity() {
  $('#page-content').innerHTML = `
    <section class="panel" style="max-width:680px">
      <div class="panel-head"><div><h2>修改管理员密码</h2><p>首次登录后请立即更换初始密码</p></div></div>
      <form id="password-form" class="form-grid">
        <label class="field field-wide"><span>当前密码</span><input name="oldPassword" type="password" autocomplete="current-password" required minlength="6" maxlength="32"></label>
        <label class="field"><span>新密码</span><input name="newPassword" type="password" autocomplete="new-password" required minlength="6" maxlength="32"></label>
        <label class="field"><span>确认新密码</span><input name="confirmPassword" type="password" autocomplete="new-password" required minlength="6" maxlength="32"></label>
        <div class="form-actions field-wide"><button class="button" type="submit">更换密码</button></div>
      </form>
    </section>`
  $('#password-form').addEventListener('submit', changePassword)
}

async function changePassword(event) {
  event.preventDefault()
  const data = Object.fromEntries(new FormData(event.currentTarget))
  if (data.newPassword !== data.confirmPassword) return toast('两次输入的新密码不一致', true)
  try {
    await api('/auth/change-password', { method: 'POST', body: { oldPassword: data.oldPassword, newPassword: data.newPassword } })
    event.currentTarget.reset()
    toast('密码已更新')
  } catch (error) { toast(error.message, true) }
}

function statusText(status) {
  return ({ pending: '待确认', booked: '已预约', checked_in: '已核销', in_service: '服务中', completed: '已完成', cancelled: '已取消', confirmed: '已开通', active: '有效', expired: '已过期' })[status] || status || '—'
}
function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? esc(value) : date.toLocaleString('zh-CN', { hour12: false })
}
function confirmDialog(message) {
  return new Promise((resolve) => {
    state.confirmAction = resolve
    $('#confirm-message').textContent = message
    $('#confirm-modal').hidden = false
  })
}

$('#admin-nav').addEventListener('click', (event) => {
  const button = event.target.closest('[data-page]')
  if (button && !button.hidden) navigate(button.dataset.page)
})
$('#menu-toggle').addEventListener('click', () => document.body.classList.toggle('menu-open'))
$('#confirm-modal').addEventListener('click', (event) => {
  const action = event.target.closest('[data-confirm]')?.dataset.confirm
  if (!action) return
  $('#confirm-modal').hidden = true
  state.confirmAction?.(action === 'ok')
  state.confirmAction = null
})

init()
