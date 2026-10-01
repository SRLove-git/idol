import { reactive } from 'vue'

export const state = reactive({
  lang: 'zh',
  store: null,
  wechat: false
})

export const translations = {
  zh: {
    nav_home: '首页',
    nav_pricing: '价位表',
    nav_booking: '预约体验',
    nav_social: '社交媒体',
    hero_desc: '拼豆工作室',
    hero_slogan: '一粒粒豆子，组成属于自己的王国',
    cta_booking: '预约体验',
    cta_pricing: '查看价位',
    reviews_title: '豆豆王国顾客评价',
    member_title: '免费奖励制度',
    member_rule_1: '每消费 $1 = 1积分',
    member_rule_2: '50 积分可减 $5',
    member_rule_3: '100 积分可减 $15',
    member_rule_4: '积分可在下次光顾时兑换',
    member_rule_5: '400积分可兑换任意一天通行证',
    feat1_title: '专业烫印',
    feat1_desc: '店内使用全自动烫画机，默认单面无孔，也提供特殊烫。工作人员会帮你完成最后的烫印步骤，确保作品完美。',
    feat2_title: '免费工具',
    feat2_desc: '店内工具有大小豆板，单双针豆笔，豆铲，立豆盘，尖头弯头镊子等。',
    feat3_title: '自定成品',
    feat3_desc: '成品可做钥匙扣，冰箱贴，手机链，风铃，Crocs鞋扣等。',
    feat4_title: '分享特惠',
    feat4_desc: '在任何社交媒体上分享，即可免费获取 30 积分。',
    highlights_title: '拼豆精选',
    btn_view_details: '查看详情',
    studio_location: '手工拼豆制作体验 · 创意像素艺术',
    pricing_title: '价位表',
    hourly_pricing: '按时计费',
    daypass_pricing: '全天通票',
    th_people: '人数',
    th_price: '价格',
    td_solo_label: '单人',
    td_duo_label: '双人',
    th_date: '日期',
    td_wed_thu: '周三 - 周四',
    td_fri_sun: '周五 - 周日',
    booking_title: '预约体验',
    label_date_select: '选择日期',
    label_time_select: '到店时间',
    label_duration_select: '预期消费时长',
    label_people_select: '预约人数',
    unit_min: '分钟',
    unit_person: '人',
    people_note: '超过4人请在下方特别说明中备注',
    opt_daypass: '全天通票',
    btn_confirm: '确认预约',
    btn_submitting: '提交中...',
    placeholder_name: '您的姓名',
    placeholder_phone: '您的电话',
    placeholder_email: '你的邮箱',
    placeholder_notes: '特别说明',
    success_title: '✓ 预约已提交！',
    success_desc: '我们已收到您的预约请求，系统将自动同步至工作室日历。请检查您的邮箱获取确认通知。',
    error_title: '⚠️ 提交失败',
    error_desc: '抱歉，预约提交时出现问题。请稍后再试或通过社交媒体联系我们。',
    social_xhs: '小红书',
    social_wechat: '微信公众号',
    footer_location_title: '店铺地址',
    footer_social_title: '社交媒体',
    footer_hours_title: '营业时间',
    wechat_scan_tip: '扫一扫，关注我们的微信公众号',
    today: '今天',
    tomorrow: '明天',
    mon: '周一', tue: '周二', wed: '周三', thu: '周四', fri: '周五', sat: '周六', sun: '周日'
  },
  en: {
    nav_home: 'Home',
    nav_pricing: 'Pricing',
    nav_booking: 'Booking',
    nav_social: 'Social',
    hero_desc: 'Perler Bead Workshop',
    hero_slogan: 'Bead by bead, building a kingdom of your own',
    cta_booking: 'Book Now',
    cta_pricing: 'View Pricing',
    reviews_title: 'Beads Land Customer Reviews',
    member_title: 'Free rewards Program',
    member_rule_1: 'Earn 1 point for every $1 spent',
    member_rule_2: '50 points = $5 off',
    member_rule_3: '100 points = $15 off',
    member_rule_4: 'Points can be redeemed upon next visit',
    member_rule_5: '400 points = Any Single Day Pass',
    feat1_title: 'Professional Ironing',
    feat1_desc: 'We use fully automatic heat presses. Default is single-sided no-hole, special ironing also available.',
    feat2_title: 'Free Tools',
    feat2_desc: 'Various boards, bead pens, scrapers, plates, and tweezers available for use.',
    feat3_title: 'Custom Products',
    feat3_desc: 'Can be made into keychains, fridge magnets, phone straps, wind chimes, Crocs jibbitz, etc.',
    feat4_title: 'Sharing Offer',
    feat4_desc: 'Share on any social media and receive 30 free points added to your account.',
    highlights_title: 'Perler Bead Highlights',
    btn_view_details: 'View Details',
    studio_location: 'DIY Perler Bead Experience · Creative Pixel Art',
    pricing_title: 'Pricing',
    hourly_pricing: 'Hourly Rate',
    daypass_pricing: 'Day Pass',
    th_people: 'People',
    th_price: 'Price',
    td_solo_label: 'Solo',
    td_duo_label: 'Duo',
    th_date: 'Date',
    td_wed_thu: 'Wed - Thu',
    td_fri_sun: 'Fri - Sun',
    booking_title: 'Book a Session',
    label_date_select: 'Select Date',
    label_time_select: 'Arrival Time',
    label_duration_select: 'Expected Duration',
    label_people_select: 'Number of People',
    unit_min: 'min',
    unit_person: 'people',
    people_note: 'For 5+ people, please note in the Special Instructions',
    opt_daypass: 'All-Day Pass',
    btn_confirm: 'Confirm',
    btn_submitting: 'Submitting...',
    placeholder_name: 'Your Name',
    placeholder_phone: 'Your Phone',
    placeholder_email: 'Email for confirmation',
    placeholder_notes: 'Special Instructions',
    success_title: '✓ Booking Submitted!',
    success_desc: "We've received your request and synced it to our calendar. Check your email for confirmation.",
    error_title: '⚠️ Submission Failed',
    error_desc: 'Sorry, there was a problem. Please try again later.',
    social_xhs: 'RedNote',
    social_wechat: 'WeChat',
    footer_location_title: 'Our Location',
    footer_social_title: 'Social Media',
    footer_hours_title: 'Opening Hours',
    wechat_scan_tip: 'Scan to follow our WeChat Account',
    today: 'Today',
    tomorrow: 'Tomorrow',
    mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun'
  }
}

export function t(key) {
  return translations[state.lang]?.[key] ?? key
}

export function fmtPrice(n) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return '—'
  return '$' + Number(n).toFixed(2).replace(/\.?0+$/, '')
}

export function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export async function loadStore() {
  try {
    const r = await fetch('/api/stores/1')
    if (r.ok) state.store = await r.json()
  } catch {
    /* keep last value */
  }
  if (state.store?.name) document.title = `${state.store.name} | DIY Bead Workshop`
  return state.store
}

export async function fetchAvailability(date) {
  try {
    const r = await fetch(`/api/appointments/availability?storeId=1&date=${date}`)
    return r.ok ? await r.json() : []
  } catch {
    return []
  }
}

export function createAppointment(dto) {
  return fetch('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto)
  })
}

export const allHighlights = [
  'photos/show_27.jpg',
  'photos/show_28.jpg',
  'photos/show_29.jpg',
  'photos/show_4.jpg',
  'photos/show_5.jpg',
  'photos/show_6.jpg',
  'photos/show_7.jpg',
  'photos/show_8.jpg',
  'photos/show_9.jpg',
  'photos/show_10.jpg',
  'photos/show_11.jpg',
  'photos/show_12.jpg',
  'photos/show_13.jpg',
  'photos/show_14.jpg',
  'photos/show_15.jpg',
  'photos/show_16.jpg',
  'photos/show_17.jpg',
  'photos/show_18.jpg',
  'photos/show_19.jpg',
  'photos/show_20.jpg',
  'photos/show_21.jpg',
  'photos/show_22.jpg',
  'photos/show_23.jpg',
  'photos/微信图片_20260411232112.jpg',
  'photos/微信图片_20260411232124.jpg',
  'photos/微信图片_20260411232130.jpg',
  'photos/微信图片_20260411232135.jpg',
  'photos/微信图片_20260411232139.jpg',
  'photos/微信图片_20260411232144.jpg',
  'photos/微信图片_20260411232150.jpg',
  'photos/微信图片_20260411232155.jpg',
  'photos/微信图片_20260411232159.jpg',
  'photos/微信图片_20260411232204.jpg',
  'photos/微信图片_20260411232208.jpg',
  'photos/微信图片_20260411232215.jpg',
  'photos/微信图片_20260411232219.jpg',
  'photos/微信图片_20260411232222.jpg',
  'photos/微信图片_20260411232227.jpg',
  'photos/微信图片_20260411232231.jpg',
  'photos/微信图片_20260411232250.jpg',
  'photos/微信图片_20260411232255.jpg',
  'photos/微信图片_20260411232258.jpg',
  'photos/微信图片_20260411232304.jpg',
  'photos/微信图片_20260411232315.jpg',
  'photos/微信图片_20260411232319.jpg',
  'photos/微信图片_20260411232323.jpg',
  'photos/微信图片_20260411232327.jpg',
  'photos/微信图片_20260411232331.jpg',
  'photos/微信图片_20260411232335.jpg',
  'photos/微信图片_20260411232338.jpg',
  'photos/微信图片_20260411232341.jpg',
  'photos/微信图片_20260411232345.jpg',
  'photos/微信图片_20260411232350.jpg',
  'photos/微信图片_20260411232354.jpg'
]
