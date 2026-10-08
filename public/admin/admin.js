const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]

const state = { me: null, page: 'dashboard', stores: [], siteContent: null, confirmAction: null }
const pageMeta = {
  dashboard: ['OVERVIEW', '数据看板'],
  appointments: ['RESERVATIONS', '预约管理'],
  content: ['WEBSITE CONTENT', '官网内容'],
  pricing: ['STORE & PRICING', '门店与价格'],
  seats: ['SEAT MANAGEMENT', '桌位管理'],
  members: ['MEMBERSHIP', '会员管理'],
  users: ['CUSTOMERS', '用户管理'],
  security: ['SECURITY', '账号安全']
}

const CONTENT_DEFAULTS = {
  zh: {
    hero_desc: '拼豆工作室', hero_slogan: 'IDOL BEADS， 与快乐同行', cta_booking: '预约体验', cta_pricing: '查看价位',
    reviews_title: 'IDOL BEADS 顾客评价', member_title: '会员专享福利', member_rule_1: '会员月卡 $19.90 SGD，年卡 $149 SGD', member_rule_2: '每件作品赠送 1 份 DIY 饰品，不限作品数量', member_rule_3: '会员到店消费享 8 折优惠',
    feat1_title: '专业烫印', feat1_desc: '店内使用全自动烫画机，默认单面无孔，也提供特殊烫。工作人员会帮你完成最后的烫印步骤，确保作品完美。', feat2_title: '免费工具', feat2_desc: '店内工具有大小豆板，单双针豆笔，豆铲，立豆盘，尖头弯头镊子等。', feat3_title: '自定成品', feat3_desc: '成品可做钥匙扣，冰箱贴，手机链，风铃，Crocs鞋扣等。', feat4_title: '分享特惠', feat4_desc: '在任何社交媒体上分享，即可免费获取 30 积分。',
    highlights_title: '拼豆精选', highlights_page_title: '拼豆作品集', highlights_page_desc: '从萌趣小物到人气角色，在这里找到你的下一个拼豆灵感。', highlights_book_title: '找到想做的款式了吗？', highlights_book_desc: '到店挑选图纸和颜色，亲手完成你的专属作品。', highlights_book_button: '预约拼豆体验',
    pricing_title: '价位表', pricing_card_title: '价位表 · Pricing', pricing_note_title: '备注 · Note', pricing_note_membership: '会员 Membership: $19.90 SGD/月 (month)，$149 SGD/年 (year)。', pricing_note_benefits: '会员福利 Member benefits: 每件作品可获赠 1 份 DIY 饰品，不限作品数量；到店消费享 8 折优惠。', pricing_note_group: '多人同行 Group rate: 两人及以上同行，非会员按多人同行价；同行里有会员，该会员按会员价计算。', pricing_note_weekend: '周末及节假日 Weekends & public holidays: 所有价格加收 10% 服务费。',
    booking_title: '预约体验', booking_closed_title: '预约暂未开放', booking_closed_desc: '门店正在筹备中，线上预约开放后我们会第一时间更新。感谢你的理解与耐心等待。', studio_location: '手工拼豆制作体验 · 创意像素艺术', footer_hours_note: '全年无休，公共假期正常营业'
  },
  en: {
    hero_desc: 'Perler Bead Workshop', hero_slogan: 'IDOL BEADS, joy every step of the way', cta_booking: 'Book Now', cta_pricing: 'View Pricing',
    reviews_title: 'IDOL BEADS Customer Reviews', member_title: 'Member Benefits', member_rule_1: 'S$19.90 monthly membership · S$149 annual membership', member_rule_2: 'One free DIY accessory with every piece, no quantity limit', member_rule_3: 'Members enjoy 20% off in-store purchases',
    feat1_title: 'Professional Ironing', feat1_desc: 'We use fully automatic heat presses. Default is single-sided no-hole, special ironing also available.', feat2_title: 'Free Tools', feat2_desc: 'Various boards, bead pens, scrapers, plates, and tweezers available for use.', feat3_title: 'Custom Products', feat3_desc: 'Can be made into keychains, fridge magnets, phone straps, wind chimes, Crocs jibbitz, etc.', feat4_title: 'Sharing Offer', feat4_desc: 'Share on any social media and receive 30 free points added to your account.',
    highlights_title: 'Perler Bead Highlights', highlights_page_title: 'Bead Creations Gallery', highlights_page_desc: 'From adorable miniatures to beloved characters, find inspiration for your next bead creation.', highlights_book_title: 'Found something you would love to make?', highlights_book_desc: 'Choose your pattern and colors in store, then bring your own creation to life.', highlights_book_button: 'Book a Beading Session',
    pricing_title: 'Pricing', pricing_card_title: 'Pricing', pricing_note_title: 'Notes', pricing_note_membership: 'Membership: S$19.90/month or S$149/year.', pricing_note_benefits: 'Member benefits: One free DIY accessory with every piece, plus 20% off in-store purchases.', pricing_note_group: 'Group rate: For 2 or more guests, non-members pay the group rate and members pay the member rate.', pricing_note_weekend: 'Weekends & public holidays: A 10% service charge applies to all prices.',
    booking_title: 'Book a Session', booking_closed_title: 'Online Booking Coming Soon', booking_closed_desc: 'We are getting the studio ready. Online booking will open soon—thank you for your patience.', studio_location: 'DIY Perler Bead Experience · Creative Pixel Art', footer_hours_note: 'Open daily, including public holidays'
  }
}

const CONTENT_GROUPS = [
  ['首页首屏', [['副标题', 'hero_desc'], ['品牌标语', 'hero_slogan', 'textarea'], ['预约按钮', 'cta_booking'], ['价位按钮', 'cta_pricing']]],
  ['会员权益', [['区块标题', 'member_title'], ['权益 1', 'member_rule_1'], ['权益 2', 'member_rule_2', 'textarea'], ['权益 3', 'member_rule_3']]],
  ['门店特色', [['特色 1 标题', 'feat1_title'], ['特色 1 说明', 'feat1_desc', 'textarea'], ['特色 2 标题', 'feat2_title'], ['特色 2 说明', 'feat2_desc', 'textarea'], ['特色 3 标题', 'feat3_title'], ['特色 3 说明', 'feat3_desc', 'textarea'], ['特色 4 标题', 'feat4_title'], ['特色 4 说明', 'feat4_desc', 'textarea']]],
  ['作品与预约', [['首页作品标题', 'highlights_title'], ['作品页标题', 'highlights_page_title'], ['作品页说明', 'highlights_page_desc', 'textarea'], ['底部引导标题', 'highlights_book_title'], ['底部引导说明', 'highlights_book_desc', 'textarea'], ['底部预约按钮', 'highlights_book_button'], ['预约区标题', 'booking_title'], ['预约关闭标题', 'booking_closed_title'], ['预约关闭说明', 'booking_closed_desc', 'textarea'], ['门店简介', 'studio_location']]],
  ['价位备注', [['区块标题', 'pricing_title'], ['价格卡标题', 'pricing_card_title'], ['备注标题', 'pricing_note_title'], ['会员价说明', 'pricing_note_membership', 'textarea'], ['会员福利说明', 'pricing_note_benefits', 'textarea'], ['多人价说明', 'pricing_note_group', 'textarea'], ['周末加价说明', 'pricing_note_weekend', 'textarea']]],
  ['页脚', [['营业时间补充说明', 'footer_hours_note', 'textarea']]]
]

const REVIEW_DEFAULTS = [
  { image: '/photos/xhs-studio.jpg', altZh: 'IDOL Beads 宽敞明亮的拼豆工作室', quoteZh: '终于在新加坡找到环境舒服、桌面宽敞的拼豆店。工作日可以直接 walk in，安排起来很方便。', altEn: 'The bright and spacious IDOL Beads studio', quoteEn: 'A bright, comfortable bead studio in Singapore with plenty of workspace. Weekday walk-ins make it especially easy to visit.' },
  { image: '/photos/xhs-character-wall.jpg', altZh: 'IDOL Beads 顾客拼豆作品展示墙', quoteZh: '牛车水里的宝藏拼豆店，常见角色和特殊烫款式都很丰富，选图的时候就已经很快乐。', altEn: 'Customer bead creations displayed at IDOL Beads', quoteEn: 'A Chinatown gem filled with character ideas and special finishing styles. Choosing a design is part of the fun.' },
  { image: '/photos/xhs-display-wall.jpg', altZh: 'IDOL Beads 拼豆作品与工具陈列', quoteZh: '从豆板、豆铲到豆针都好看又顺手，颜色摆放清楚，慢慢拼一下午也很放松。', altEn: 'Bead creations and tools displayed at IDOL Beads', quoteEn: 'The boards, scoops, pens and neatly arranged colours are lovely to use—a relaxing place to spend a creative afternoon.' }
]

const MEDIA_DEFAULTS = {
  logo: '/photos/idol-logo.png', heroBackground: '/photos/hero-studio.jpg',
  banners: ['/photos/banner-floor-2.png', '/photos/banner-floor-1.png'],
  featureIcons: [1, 2, 3, 4].map((n) => `/photos/feat-icon-${n}.png`),
  featuredHighlights: ['/photos/xhs-studio.jpg', '/photos/xhs-character-wall.jpg', '/photos/xhs-display-wall.jpg']
}

const GALLERY_DEFAULTS = [
  ...MEDIA_DEFAULTS.featuredHighlights,
  '/photos/xhs-bead-colors.jpg',
  ...[27, 28, 29, ...Array.from({ length: 20 }, (_, index) => index + 4)].map((n) => `/photos/show_${n}.jpg`),
  ...['20260411232112','20260411232124','20260411232130','20260411232135','20260411232139','20260411232144','20260411232150','20260411232155','20260411232159','20260411232204','20260411232208','20260411232215','20260411232219','20260411232222','20260411232227','20260411232231','20260411232250','20260411232255','20260411232258','20260411232304','20260411232315','20260411232319','20260411232323','20260411232327','20260411232331','20260411232335','20260411232338','20260411232341','20260411232345','20260411232350','20260411232354'].map((stamp) => `/photos/微信图片_${stamp}.jpg`)
]

const LINK_DEFAULTS = {
  instagram: 'https://www.instagram.com/idol_beads',
  xiaohongshu: 'https://www.xiaohongshu.com/user/profile/650d5c8e00000000120075e5',
  douyin: 'https://v.douyin.com/lQTCIhRoSAY/'
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char])
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (options.body && typeof options.body !== 'string' && !(options.body instanceof FormData)) {
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
  loadCaptcha()
}

async function loadCaptcha() {
  try {
    const data = await api('/captcha')
    $('#captcha-id').value = data.id || ''
    $('#captcha-image').src = data.image || ''
    $('[name="captchaText"]')?.setAttribute('required', '')
  } catch {
    $('.captcha-field').hidden = true
    $('[name="captchaText"]')?.removeAttribute('required')
  }
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
    if (page === 'content') await renderContent()
    if (page === 'pricing') await renderPricing()
    if (page === 'seats') await renderSeats()
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
  const memberTag = item.isMember ? '<span class="appointment-member-tag">★ 会员预约</span>' : ''
  return `<tr class="${item.isMember ? 'appointment-member-row' : ''}"><td><strong>${esc(item.code)}</strong>${memberTag}</td><td>${esc(item.userNickname || `用户 #${item.userId}`)}<br><small>${esc(item.userEmail || '')}</small></td><td>${esc(item.date)}<br><small>${esc(item.startTime)} - ${esc(item.endTime)}</small></td><td>${item.peopleCount}</td><td>$${Number(item.amount || 0).toFixed(2)}${item.isMember && Number(item.originalAmount || 0) > Number(item.amount || 0) ? `<br><small class="member-saving">原价 $${Number(item.originalAmount).toFixed(2)}</small>` : ''}</td><td><span class="status status-${item.status}">${statusText(item.status)}</span></td><td class="actions">${actions.join('') || '—'}</td></tr>`
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

function copySiteContent(value) {
  return JSON.parse(JSON.stringify(value && typeof value === 'object' ? value : {}))
}

function textValue(content, lang, key) {
  return content.translations?.[lang]?.[key] ?? CONTENT_DEFAULTS[lang]?.[key] ?? ''
}

function contentControl(lang, key, value, type = 'text') {
  const attrs = `data-copy-lang="${lang}" data-copy-key="${key}"`
  return type === 'textarea'
    ? `<textarea ${attrs}>${esc(value)}</textarea>`
    : `<input ${attrs} value="${esc(value)}">`
}

function contentGroup(title, fields, content) {
  return `<section class="panel content-panel">
    <div class="panel-head"><div><h2>${esc(title)}</h2><p>中英文会根据官网语言自动切换</p></div></div>
    <div class="copy-table">
      <div class="copy-row copy-head"><b>内容位置</b><b>中文</b><b>English</b></div>
      ${fields.map(([label, key, type]) => `<div class="copy-row"><label>${esc(label)}</label>${contentControl('zh', key, textValue(content, 'zh', key), type)}${contentControl('en', key, textValue(content, 'en', key), type)}</div>`).join('')}
    </div>
  </section>`
}

function mediaField(label, name, value, multiple = false, hint = '') {
  if (multiple) {
    return `<label class="field field-wide"><span>${esc(label)}</span><textarea class="media-list" name="${name}" placeholder="每行一个图片 URL">${esc((value || []).join('\n'))}</textarea>${hint ? `<small>${esc(hint)}</small>` : ''}<button class="button button-ghost media-upload-button" type="button" data-upload-target="${name}" data-upload-multiple="true">上传并添加图片</button></label>`
  }
  return `<label class="field"><span>${esc(label)}</span><div class="field-with-action"><input name="${name}" value="${esc(value || '')}" placeholder="/photos/example.jpg"><button class="button button-ghost media-upload-button" type="button" data-upload-target="${name}">上传</button></div></label>`
}

function reviewEditor(review, index) {
  return `<article class="review-editor" data-review-index="${index}">
    <div class="review-editor-preview"><img src="${esc(review.image)}" alt=""><span>评价 ${index + 1}</span></div>
    <div class="form-grid">
      ${mediaField('图片 URL', `reviewImage${index}`, review.image)}
      ${field('中文图片说明', `reviewAltZh${index}`, review.altZh || '')}
      ${field('English image alt', `reviewAltEn${index}`, review.altEn || '')}
      <label class="field"><span>中文评价</span><textarea name="reviewQuoteZh${index}">${esc(review.quoteZh || '')}</textarea></label>
      <label class="field"><span>English review</span><textarea name="reviewQuoteEn${index}">${esc(review.quoteEn || '')}</textarea></label>
    </div>
  </article>`
}

function mediaEditor(label, name, value = '', removable = false, index = 0) {
  return `<article class="media-editor" data-media-item>
    <div class="media-editor-preview${value ? '' : ' is-empty'}">
      <img src="${esc(value)}" alt=""${value ? '' : ' hidden'}>
      <span class="media-index">${esc(removable ? `图片 ${index + 1}` : label)}</span>
      <em>暂无图片</em>
    </div>
    <div class="media-editor-fields">
      <div class="media-editor-title">
        <strong>${esc(label)}</strong>
        ${removable ? `<div class="media-editor-actions">
          <button class="button button-ghost button-small" type="button" data-media-action="up" title="上移">↑</button>
          <button class="button button-ghost button-small" type="button" data-media-action="down" title="下移">↓</button>
          <button class="button button-ghost button-small media-remove" type="button" data-media-action="remove">删除</button>
        </div>` : ''}
      </div>
      <label class="field"><span>图片 URL</span><div class="field-with-action"><input class="media-url-input" name="${esc(name)}" value="${esc(value)}" placeholder="/photos/example.jpg"><button class="button button-ghost media-upload-button" type="button" data-upload-target="${esc(name)}">${value ? '替换' : '上传'}</button></div></label>
    </div>
  </article>`
}

function mediaCollection(label, name, values, hint = '') {
  const items = Array.isArray(values) ? values : []
  return `<section class="media-collection" data-media-collection="${esc(name)}">
    <div class="media-collection-head">
      <div><h3>${esc(label)}</h3>${hint ? `<p>${esc(hint)}</p>` : ''}</div>
      <div class="media-collection-actions">
        <button class="button button-ghost" type="button" data-add-media="${esc(name)}">添加一张</button>
        <button class="button" type="button" data-upload-collection="${esc(name)}">批量上传</button>
      </div>
    </div>
    <div class="media-editor-list">${items.map((value, index) => mediaEditor(label, name, value, true, index)).join('')}</div>
  </section>`
}

async function renderContent() {
  const stores = await api('/admin/stores')
  state.stores = stores
  const store = stores[0]
  if (!store) { $('#page-content').innerHTML = '<div class="panel empty">暂无门店，请先创建门店</div>'; return }
  const content = copySiteContent(store.siteContent)
  const media = { ...MEDIA_DEFAULTS, galleryImages: GALLERY_DEFAULTS, ...(content.media || {}) }
  const links = { ...LINK_DEFAULTS, ...(content.links || {}) }
  const reviews = Array.isArray(content.reviews) && content.reviews.length ? content.reviews : REVIEW_DEFAULTS
  state.siteContent = content

  $('#page-content').innerHTML = `<form id="content-form" data-id="${store.id}">
    <section class="panel content-panel">
      <div class="panel-head"><div><h2>站点信息</h2><p>浏览器标题、搜索描述与官网主要联系入口</p></div><a class="button button-ghost" href="/" target="_blank">预览官网 ↗</a></div>
      <div class="form-grid">
        ${field('浏览器标题', 'metaTitle', content.meta?.title || `${store.name} | DIY Bead Workshop`)}
        <label class="field field-wide"><span>站点描述</span><textarea name="metaDescription">${esc(content.meta?.description || '')}</textarea></label>
        ${field('Instagram 链接', 'instagram', links.instagram)}
        ${field('小红书链接', 'xiaohongshu', links.xiaohongshu)}
        ${field('抖音链接', 'douyin', links.douyin)}
      </div>
    </section>

    ${CONTENT_GROUPS.map(([title, fields]) => contentGroup(title, fields, content)).join('')}

    <section class="panel content-panel">
      <div class="panel-head"><div><h2>顾客评价</h2><p>编辑首页评价图片、中英文内容与无障碍说明</p></div></div>
      <div class="review-editor-list">${reviews.map(reviewEditor).join('')}</div>
    </section>

    <section class="panel content-panel">
      <div class="panel-head"><div><h2>图片与作品库</h2><p>左侧查看图片，右侧修改地址或替换上传；多图可添加、删除与调整顺序</p></div></div>
      <div class="media-editor-list media-single-list">
        ${mediaEditor('站点 Logo', 'logo', media.logo)}
        ${mediaEditor('首屏背景图', 'heroBackground', media.heroBackground)}
      </div>
      ${mediaCollection('活动轮播图', 'banners', media.banners, '按从上到下的顺序轮播展示')}
      ${mediaCollection('特色图标', 'featureIcons', media.featureIcons, '建议保留 4 张')}
      ${mediaCollection('首页拼豆精选', 'featuredHighlights', media.featuredHighlights, '建议保留 3 张')}
      ${mediaCollection('独立作品页图库', 'galleryImages', media.galleryImages, '按从上到下的顺序展示全部作品')}
    </section>

    <div class="content-savebar"><span>保存后刷新官网即可看到更新</span><button class="button" type="submit">保存全部官网内容</button></div>
  </form>`

  $('#content-form').addEventListener('submit', saveSiteContent)
  bindMediaUploads($('#content-form'))
}

function lines(value) {
  return String(value || '').split('\n').map((item) => item.trim()).filter(Boolean)
}

async function saveSiteContent(event) {
  event.preventDefault()
  const form = event.currentTarget
  const data = new FormData(form)
  const content = copySiteContent(state.siteContent)
  content.translations = { zh: {}, en: {} }
  $$('[data-copy-lang]', form).forEach((control) => {
    content.translations[control.dataset.copyLang][control.dataset.copyKey] = control.value.trim()
  })
  content.meta = { title: data.get('metaTitle').trim(), description: data.get('metaDescription').trim() }
  content.links = { instagram: data.get('instagram').trim(), xiaohongshu: data.get('xiaohongshu').trim(), douyin: data.get('douyin').trim() }
  content.media = {
    ...(content.media || {}),
    logo: data.get('logo').trim(),
    heroBackground: data.get('heroBackground').trim(),
    banners: data.getAll('banners').map((value) => value.trim()).filter(Boolean),
    featureIcons: data.getAll('featureIcons').map((value) => value.trim()).filter(Boolean),
    featuredHighlights: data.getAll('featuredHighlights').map((value) => value.trim()).filter(Boolean)
  }
  const galleryImages = data.getAll('galleryImages').map((value) => value.trim()).filter(Boolean)
  content.media.galleryImages = galleryImages
  content.reviews = REVIEW_DEFAULTS.map((_, index) => ({
    image: data.get(`reviewImage${index}`).trim(),
    altZh: data.get(`reviewAltZh${index}`).trim(),
    quoteZh: data.get(`reviewQuoteZh${index}`).trim(),
    altEn: data.get(`reviewAltEn${index}`).trim(),
    quoteEn: data.get(`reviewQuoteEn${index}`).trim()
  }))
  try {
    await api(`/admin/stores/${form.dataset.id}`, { method: 'PATCH', body: { siteContent: content } })
    state.siteContent = content
    toast('官网内容已保存')
  } catch (error) { toast(error.message, true) }
}

function bindMediaUploads(root) {
  function syncMediaPreview(input) {
    const editor = input.closest('.media-editor, .review-editor')
    const preview = editor?.querySelector('.media-editor-preview, .review-editor-preview')
    const image = preview?.querySelector('img')
    if (!image) return
    image.src = input.value.trim()
    image.hidden = !input.value.trim()
    preview.classList.toggle('is-empty', !input.value.trim())
  }

  function renumberCollection(collection) {
    $$('[data-media-item]', collection).forEach((item, index) => {
      const badge = $('.media-index', item)
      if (badge) badge.textContent = `图片 ${index + 1}`
    })
  }

  async function chooseAndUpload(button, multiple = false) {
    const picker = document.createElement('input')
    picker.type = 'file'
    picker.accept = 'image/jpeg,image/png,image/gif,image/webp'
    picker.multiple = multiple
    return new Promise((resolve) => {
      picker.addEventListener('change', async () => {
        if (!picker.files?.length) return resolve([])
        button.disabled = true
        const original = button.textContent
        button.textContent = '上传中…'
        try {
          const urls = []
          for (const file of picker.files) {
            const body = new FormData()
            body.append('file', file)
            const result = await api('/uploads/images?folder=site', { method: 'POST', body })
            urls.push(result.url)
          }
          toast(`已上传 ${urls.length} 张图片，请记得保存`)
          resolve(urls)
        } catch (error) {
          toast(error.message, true)
          resolve([])
        } finally {
          button.disabled = false
          button.textContent = original
        }
      }, { once: true })
      picker.click()
    })
  }

  root.addEventListener('input', (event) => {
    if (event.target.matches('.media-url-input, [name^="reviewImage"]')) syncMediaPreview(event.target)
  })

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('button')
    if (!button || !root.contains(button)) return

    if (button.dataset.addMedia) {
      const collection = button.closest('[data-media-collection]')
      const list = $('.media-editor-list', collection)
      list.insertAdjacentHTML('beforeend', mediaEditor(collection.querySelector('h3').textContent, button.dataset.addMedia, '', true, list.children.length))
      $('.media-url-input', list.lastElementChild).focus()
      return
    }

    if (button.dataset.uploadCollection) {
      const urls = await chooseAndUpload(button, true)
      const collection = button.closest('[data-media-collection]')
      const list = $('.media-editor-list', collection)
      urls.forEach((url) => list.insertAdjacentHTML('beforeend', mediaEditor(collection.querySelector('h3').textContent, button.dataset.uploadCollection, url, true, list.children.length)))
      renumberCollection(collection)
      return
    }

    if (button.dataset.mediaAction) {
      const item = button.closest('[data-media-item]')
      const collection = button.closest('[data-media-collection]')
      if (button.dataset.mediaAction === 'remove') item.remove()
      if (button.dataset.mediaAction === 'up' && item.previousElementSibling) item.parentElement.insertBefore(item, item.previousElementSibling)
      if (button.dataset.mediaAction === 'down' && item.nextElementSibling) item.parentElement.insertBefore(item.nextElementSibling, item)
      renumberCollection(collection)
      return
    }

    if (!button.dataset.uploadTarget) return
    const urls = await chooseAndUpload(button, button.dataset.uploadMultiple === 'true')
    if (!urls.length) return
    const target = button.closest('.media-editor, .review-editor')?.querySelector(`[name="${button.dataset.uploadTarget}"]`) || root.querySelector(`[name="${button.dataset.uploadTarget}"]`)
    if (!target) return
    if (target.tagName === 'TEXTAREA') target.value = [...lines(target.value), ...urls].join('\n')
    else target.value = urls[0]
    syncMediaPreview(target)
  })
}

async function renderPricing() {
  const stores = await api('/admin/stores')
  state.stores = stores
  const store = stores[0]
  if (!store) { $('#page-content').innerHTML = '<div class="panel empty">暂无门店</div>'; return }
  $('#page-content').innerHTML = `
    <section class="panel"><div class="panel-head"><div><h2>门店基础资料</h2><p>官网地址、营业时间与 App 门店资料统一在此管理</p></div></div>
      <form id="store-form" class="form-grid" data-id="${store.id}">
        ${field('门店名称', 'name', store.name)}${field('营业时间（HH:mm-HH:mm）', 'businessHours', store.businessHours)}${field('联系电话', 'phone', store.phone || '')}
        <label class="field field-wide"><span>门店地址</span><input name="address" value="${esc(store.address)}"></label>
        ${field('纬度', 'lat', store.lat ?? '', 'number', '0.0000001')}${field('经度', 'lng', store.lng ?? '', 'number', '0.0000001')}${field('门店评分（0-5）', 'rating', store.rating ?? 5, 'number', '0.1')}
        <label class="field field-wide"><span>门店图片（每行一个 URL）</span><textarea name="images">${esc((store.images || []).join('\n'))}</textarea></label>
        <label class="toggle-field field-wide"><input name="enabled" type="checkbox" ${store.enabled ? 'checked' : ''}><span>启用门店（关闭后官网无法读取该门店）</span></label>
        <div class="form-actions field-wide"><button class="button" type="submit">保存门店资料</button></div>
      </form>
    </section>

    <section class="panel config-section"><div class="panel-head"><div><h2>基础价格</h2><p>修改后同步影响官网价位表与预约结算</p></div></div>
      <form id="price-form" class="form-grid" data-id="${store.id}">
        ${field('1 小时单人价', 'price', store.price, 'number', '0.01')}${field('1 小时会员价', 'memberPrice', store.memberPrice, 'number', '0.01')}${field('1 小时多人价', 'groupPrice', store.groupPrice, 'number', '0.01')}
        ${field('全天单人价', 'allDayPrice', store.allDayPrice, 'number', '0.01')}${field('全天会员价', 'allDayMemberPrice', store.allDayMemberPrice, 'number', '0.01')}${field('全天多人价', 'allDayGroupPrice', store.allDayGroupPrice, 'number', '0.01')}
        ${field('周末/节假日加价 %', 'weekendSurchargePercent', store.weekendSurchargePercent, 'number', '0.01')}
        <div class="form-actions field-wide"><button class="button" type="submit">保存基础价格</button></div>
      </form>
    </section>

    <section class="panel config-section"><div class="panel-head"><div><h2>时长套餐</h2><p>可新增、修改、上下架任意时长套餐</p></div></div>
      <div class="config-card-list">${(store.packages || []).sort((a, b) => a.sortOrder - b.sortOrder).map(packageEditor).join('') || '<div class="empty">暂无套餐</div>'}</div>
      <details class="create-config"><summary>+ 新增时长套餐</summary>${packageEditor({ storeId: store.id, enabled: true, sortOrder: (store.packages || []).length + 1 }, true)}</details>
    </section>

    <div class="section-grid config-section">
      <section class="panel"><div class="panel-head"><div><h2>桌位配置</h2><p>容量可选 1 / 2 / 4 人，桌号自动生成</p></div></div>
        <div class="compact-config-list">${(store.tables || []).sort((a, b) => a.id - b.id).map(tableEditor).join('') || '<div class="empty">暂无桌位</div>'}</div>
        <form id="table-create-form" class="inline-create" data-store-id="${store.id}"><select name="capacity"><option value="1">1 人桌</option><option value="2">2 人桌</option><option value="4">4 人桌</option></select><button class="button" type="submit">+新增桌位</button></form>
      </section>
      <section class="panel"><div class="panel-head"><div><h2>可约时段</h2><p>用于 App 与预约接口的门店时段</p></div></div>
        <div class="compact-config-list">${(store.slots || []).sort((a, b) => a.startTime.localeCompare(b.startTime)).map(slotEditor).join('') || '<div class="empty">暂无时段</div>'}</div>
        <form id="slot-create-form" class="inline-create" data-store-id="${store.id}"><input name="startTime" type="time" required><input name="endTime" type="time" required><button class="button" type="submit">+新增时段</button></form>
      </section>
    </div>`
  $('#store-form').addEventListener('submit', saveStore)
  $('#price-form').addEventListener('submit', savePrices)
  $$('.package-form').forEach((form) => form.addEventListener('submit', savePackage))
  $$('[data-delete-package]').forEach((button) => button.addEventListener('click', () => deleteConfig('packages', button.dataset.deletePackage, '删除这个时长套餐？')))
  $$('.table-form').forEach((form) => form.addEventListener('submit', saveTable))
  $$('[data-delete-table]').forEach((button) => button.addEventListener('click', () => deleteConfig('tables', button.dataset.deleteTable, '删除这个桌位？')))
  $('#table-create-form').addEventListener('submit', createTable)
  $$('.slot-form').forEach((form) => form.addEventListener('submit', saveSlot))
  $$('[data-delete-slot]').forEach((button) => button.addEventListener('click', () => deleteConfig('slots', button.dataset.deleteSlot, '删除这个可约时段？')))
  $('#slot-create-form').addEventListener('submit', createSlot)
}

function seatAdminEditor(item) {
  return `<form class="seat-admin-card table-form${item.enabled ? '' : ' is-disabled'}" data-id="${item.id}">
    <div class="seat-admin-preview">
      <span>${item.enabled ? '前台可选' : '已停用'}</span>
      <strong>${esc(item.name)}</strong>
      <small>${item.capacity} 人桌</small>
    </div>
    <div class="seat-admin-controls">
      <label class="field"><span>桌位名称</span><input name="name" value="${esc(item.name)}" maxlength="50" required></label>
      <label class="field"><span>容纳人数</span><select name="capacity">${[1,2,4].map((n) => `<option value="${n}"${item.capacity === n ? ' selected' : ''}>${n} 人</option>`).join('')}</select></label>
      <label class="mini-toggle seat-admin-toggle"><input name="enabled" type="checkbox" ${item.enabled ? 'checked' : ''}><span>允许前台预约</span></label>
      <div class="seat-admin-actions"><button class="button" type="submit">保存</button><button class="button button-ghost" type="button" data-delete-table="${item.id}" data-table-name="${esc(item.name)}">删除</button></div>
    </div>
  </form>`
}

async function renderSeats() {
  const [stores, bookingStatus] = await Promise.all([
    api('/admin/stores'),
    api('/appointments/status')
  ])
  state.stores = stores
  const store = stores[0]
  if (!store) { $('#page-content').innerHTML = '<div class="panel empty">暂无门店，请先创建门店</div>'; return }
  const tables = [...(store.tables || [])].sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true }))
  const enabledTables = tables.filter((item) => item.enabled)
  const totalCapacity = enabledTables.reduce((sum, item) => sum + Number(item.capacity || 0), 0)

  $('#page-content').innerHTML = `
    <div class="stats-grid seat-stats">
      ${statCard('桌位总数', tables.length, `启用 ${enabledTables.length} 个`, '#fff1f4')}
      ${statCard('可预约座位', totalCapacity, '按已启用桌位容量统计', '#eaf7f3')}
      ${statCard('线上预约', bookingStatus.enabled ? '已开放' : '已关闭', bookingStatus.enabled ? '顾客可选择桌位' : '当前不会产生新预约', bookingStatus.enabled ? '#eaf7f3' : '#f1f3f5')}
    </div>
    <section class="panel seat-management-panel">
      <div class="panel-head"><div><h2>桌位布局</h2><p>每个方块对应前台的一个桌位；停用后立即从可选列表隐藏</p></div><span class="status ${bookingStatus.enabled ? 'status-active' : 'status-expired'}">预约${bookingStatus.enabled ? '开放中' : '已关闭'}</span></div>
      <div class="seat-admin-grid">${tables.length ? tables.map(seatAdminEditor).join('') : '<div class="empty">暂无桌位，请先创建</div>'}</div>
    </section>
    <section class="panel seat-create-panel">
      <div class="panel-head"><div><h2>新增桌位</h2><p>名称留空时按容量自动生成：A=1 人、B=2 人、C=4 人</p></div></div>
      <form id="table-create-form" class="seat-create-form" data-store-id="${store.id}">
        <label class="field"><span>桌位名称（可选）</span><input name="name" maxlength="50" placeholder="例如 VIP1；留空则自动生成"></label>
        <label class="field"><span>容纳人数</span><select name="capacity"><option value="1">1 人桌</option><option value="2">2 人桌</option><option value="4">4 人桌</option></select></label>
        <button class="button" type="submit">+ 新增桌位</button>
      </form>
    </section>`

  $$('.table-form').forEach((form) => form.addEventListener('submit', saveTable))
  $$('[data-delete-table]').forEach((button) => button.addEventListener('click', () => deleteConfig('tables', button.dataset.deleteTable, `删除桌位 ${button.dataset.tableName || ''}？已有预约中的桌位记录仍会保留。`)))
  $('#table-create-form').addEventListener('submit', createTable)
}

function field(label, name, value, type = 'text', step = '') {
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}"${step ? ` step="${step}"` : ''} value="${esc(value ?? '')}"></label>`
}
function formObject(form, numeric = []) {
  const data = Object.fromEntries(new FormData(form))
  numeric.forEach((key) => {
    if (!(key in data)) return
    if (data[key] === '') delete data[key]
    else data[key] = Number(data[key])
  })
  return data
}
async function saveStore(event) {
  event.preventDefault()
  try {
    const body = formObject(event.currentTarget, ['lat','lng','rating'])
    body.images = lines(body.images)
    body.enabled = event.currentTarget.elements.enabled.checked
    await api(`/admin/stores/${event.currentTarget.dataset.id}`, { method: 'PATCH', body })
    toast('门店资料已更新')
    await renderPricing()
  } catch (error) { toast(error.message, true) }
}

async function savePrices(event) {
  event.preventDefault()
  try {
    const body = formObject(event.currentTarget, ['price','memberPrice','groupPrice','allDayPrice','allDayMemberPrice','allDayGroupPrice','weekendSurchargePercent'])
    await api(`/admin/stores/${event.currentTarget.dataset.id}`, { method: 'PATCH', body })
    toast('基础价格已更新')
    await renderPricing()
  } catch (error) { toast(error.message, true) }
}

function packageEditor(pkg, create = false) {
  return `<form class="config-card package-form" data-id="${pkg.id || ''}" data-store-id="${pkg.storeId || ''}">
    <div class="form-grid">${field('套餐名称', 'name', pkg.name || '')}${field('时长（小时）', 'hours', pkg.hours || '', 'number', '1')}${field('排序', 'sortOrder', pkg.sortOrder ?? 0, 'number', '1')}${field('单人价', 'price', pkg.price ?? '', 'number', '0.01')}${field('会员价', 'memberPrice', pkg.memberPrice ?? '', 'number', '0.01')}${field('多人价', 'groupPrice', pkg.groupPrice ?? '', 'number', '0.01')}
      <label class="toggle-field field-wide"><input name="enabled" type="checkbox" ${pkg.enabled !== false ? 'checked' : ''}><span>启用套餐</span></label>
      <div class="form-actions field-wide"><button class="button" type="submit">${create ? '创建套餐' : '保存套餐'}</button>${create ? '' : `<button class="button button-ghost" type="button" data-delete-package="${pkg.id}">删除</button>`}</div>
    </div></form>`
}

async function savePackage(event) {
  event.preventDefault()
  try {
    const body = formObject(event.currentTarget, ['hours','sortOrder','price','memberPrice','groupPrice'])
    body.enabled = event.currentTarget.elements.enabled.checked
    const id = event.currentTarget.dataset.id
    const url = id ? `/admin/stores/packages/${id}` : `/admin/stores/${event.currentTarget.dataset.storeId}/packages`
    await api(url, { method: id ? 'PATCH' : 'POST', body })
    toast(id ? '套餐已更新' : '套餐已创建')
    await renderPricing()
  } catch (error) { toast(error.message, true) }
}

function tableEditor(item) {
  return `<form class="compact-config table-form" data-id="${item.id}"><strong>${esc(item.name)}</strong><select name="capacity">${[1,2,4].map((n) => `<option value="${n}"${item.capacity === n ? ' selected' : ''}>${n} 人</option>`).join('')}</select><label class="mini-toggle"><input name="enabled" type="checkbox" ${item.enabled ? 'checked' : ''}><span>启用</span></label><button class="button button-small" type="submit">保存</button><button class="button button-small button-ghost" type="button" data-delete-table="${item.id}">删除</button></form>`
}

async function saveTable(event) {
  event.preventDefault()
  const form = event.currentTarget
  try {
    const body = { capacity: Number(form.elements.capacity.value), enabled: form.elements.enabled.checked }
    if (form.elements.name) body.name = form.elements.name.value.trim()
    await api(`/admin/stores/tables/${form.dataset.id}`, { method: 'PATCH', body })
    toast('桌位已更新'); await (state.page === 'seats' ? renderSeats() : renderPricing())
  } catch (error) { toast(error.message, true) }
}

async function createTable(event) {
  event.preventDefault()
  const form = event.currentTarget
  try {
    const body = { capacity: Number(form.elements.capacity.value), enabled: true }
    if (form.elements.name?.value.trim()) body.name = form.elements.name.value.trim()
    await api(`/admin/stores/${form.dataset.storeId}/tables`, { method: 'POST', body })
    toast('桌位已创建'); await (state.page === 'seats' ? renderSeats() : renderPricing())
  } catch (error) { toast(error.message, true) }
}

function slotEditor(item) {
  return `<form class="compact-config slot-form" data-id="${item.id}"><input name="startTime" type="time" value="${esc(item.startTime)}" required><span>至</span><input name="endTime" type="time" value="${esc(item.endTime)}" required><label class="mini-toggle"><input name="enabled" type="checkbox" ${item.enabled ? 'checked' : ''}><span>启用</span></label><button class="button button-small" type="submit">保存</button><button class="button button-small button-ghost" type="button" data-delete-slot="${item.id}">删除</button></form>`
}

async function saveSlot(event) {
  event.preventDefault()
  const form = event.currentTarget
  try {
    await api(`/admin/stores/slots/${form.dataset.id}`, { method: 'PATCH', body: { startTime: form.elements.startTime.value, endTime: form.elements.endTime.value, enabled: form.elements.enabled.checked } })
    toast('时段已更新'); await renderPricing()
  } catch (error) { toast(error.message, true) }
}

async function createSlot(event) {
  event.preventDefault()
  const form = event.currentTarget
  try {
    await api(`/admin/stores/${form.dataset.storeId}/slots`, { method: 'POST', body: { startTime: form.elements.startTime.value, endTime: form.elements.endTime.value, enabled: true } })
    toast('时段已创建'); await renderPricing()
  } catch (error) { toast(error.message, true) }
}

async function deleteConfig(type, id, message) {
  if (!await confirmDialog(message)) return
  try {
    await api(`/admin/stores/${type}/${id}`, { method: 'DELETE' })
    toast('已删除'); await (type === 'tables' && state.page === 'seats' ? renderSeats() : renderPricing())
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
$('#captcha-refresh').addEventListener('click', loadCaptcha)
$('#confirm-modal').addEventListener('click', (event) => {
  const action = event.target.closest('[data-confirm]')?.dataset.confirm
  if (!action) return
  $('#confirm-modal').hidden = true
  state.confirmAction?.(action === 'ok')
  state.confirmAction = null
})

init()
