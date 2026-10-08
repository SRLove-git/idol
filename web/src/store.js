import { reactive } from 'vue'

export const state = reactive({
  lang: 'zh',
  store: null,
  wechat: false,
  bookingEnabled: false
})

export const translations = {
  zh: {
    nav_home: '首页',
    nav_highlights: '拼豆精选',
    nav_pricing: '价位表',
    nav_booking: '预约体验',
    nav_social: '社交媒体',
    hero_desc: '拼豆工作室',
    hero_slogan: '一粒粒豆子，组成属于自己的王国',
    cta_booking: '预约体验',
    cta_pricing: '查看价位',
    reviews_title: 'IDOL BEADS 顾客评价',
    member_title: '会员专享福利',
    member_rule_1: '会员月卡 $19.90 SGD，年卡 $149 SGD',
    member_rule_2: '每件作品赠送 1 份 DIY 饰品，不限作品数量',
    member_rule_3: '会员到店消费享 8 折优惠',
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
    highlights_page_kicker: 'BEAD CREATIONS',
    highlights_page_title: '拼豆作品集',
    highlights_page_desc: '从萌趣小物到人气角色，在这里找到你的下一个拼豆灵感。',
    highlights_gallery_label: '全部作品',
    highlights_gallery_count: '件创意作品',
    highlights_book_title: '找到想做的款式了吗？',
    highlights_book_desc: '到店挑选图纸和颜色，亲手完成你的专属作品。',
    highlights_book_button: '预约拼豆体验',
    highlights_back_home: '返回首页',
    studio_location: '手工拼豆制作体验 · 创意像素艺术',
    pricing_title: '价位表',
    pricing_card_title: '价位表 · Pricing',
    pricing_note_title: '备注 · Note',
    pricing_note_membership: '会员 Membership: $19.90 SGD/月 (month)，$149 SGD/年 (year)。',
    pricing_note_benefits: '会员福利 Member benefits: 每件作品可获赠 1 份 DIY 饰品，不限作品数量；到店消费享 8 折优惠。',
    pricing_note_group: '多人同行 Group rate: 两人及以上同行，非会员按多人同行价；同行里有会员，该会员按会员价计算。',
    pricing_note_weekend: '周末及节假日 Weekends & public holidays: 所有价格加收 10% 服务费。',
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
    booking_closed_title: '预约暂未开放',
    booking_closed_desc: '门店正在筹备中，线上预约开放后我们会第一时间更新。感谢你的理解与耐心等待。',
    label_date_select: '选择日期',
    label_time_select: '到店时间',
    label_duration_select: '预期消费时长',
    label_people_select: '预约人数',
    label_table_select: '选择桌位',
    table_select_hint: '请选择到店时间后再选桌位；多人可组合选择多个桌位。',
    table_select_time_first: '请先选择到店时间',
    table_loading: '正在读取桌位状态…',
    table_available: '可选择',
    table_selected: '已选择',
    table_occupied: '已占用',
    table_empty: '暂无可用桌位',
    label_personal_info: '填写预约信息',
    unit_min: '分钟',
    unit_person: '人',
    people_note: '超过4人请在下方特别说明中备注',
    opt_daypass: '全天通票',
    opt_one_hour: '1 小时',
    opt_four_hours: '4 小时',
    btn_confirm: '确认预约',
    btn_submitting: '提交中...',
    placeholder_name: '您的姓名',
    placeholder_phone: '您的电话',
    placeholder_email: '你的邮箱',
    placeholder_notes: '特别说明',
    success_title: '✓ 预约已提交！',
    success_desc: '预约已成功提交。请保存预约码；如果邮箱已有账号，本次预约会自动显示在该账号下。',
    error_title: '⚠️ 提交失败',
    error_desc: '抱歉，预约提交时出现问题。请稍后再试或通过社交媒体联系我们。',
    social_xhs: '小红书',
    social_wechat: '微信公众号',
    footer_location_title: '店铺地址',
    footer_social_title: '社交媒体',
    footer_hours_title: '营业时间',
    footer_hours_note: '全年无休，公共假期正常营业',
    wechat_scan_tip: '扫一扫，关注我们的微信公众号',
    today: '今天',
    tomorrow: '明天',
    mon: '周一', tue: '周二', wed: '周三', thu: '周四', fri: '周五', sat: '周六', sun: '周日'
  },
  en: {
    nav_home: 'Home',
    nav_highlights: 'Gallery',
    nav_pricing: 'Pricing',
    nav_booking: 'Booking',
    nav_social: 'Social',
    hero_desc: 'Perler Bead Workshop',
    hero_slogan: 'Bead by bead, building a kingdom of your own',
    cta_booking: 'Book Now',
    cta_pricing: 'View Pricing',
    reviews_title: 'IDOL BEADS Customer Reviews',
    member_title: 'Member Benefits',
    member_rule_1: 'S$19.90 monthly membership · S$149 annual membership',
    member_rule_2: 'One free DIY accessory with every piece, no quantity limit',
    member_rule_3: 'Members enjoy 20% off in-store purchases',
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
    highlights_page_kicker: 'BEAD CREATIONS',
    highlights_page_title: 'Bead Creations Gallery',
    highlights_page_desc: 'From adorable miniatures to beloved characters, find inspiration for your next bead creation.',
    highlights_gallery_label: 'All Creations',
    highlights_gallery_count: 'creative pieces',
    highlights_book_title: 'Found something you would love to make?',
    highlights_book_desc: 'Choose your pattern and colors in store, then bring your own creation to life.',
    highlights_book_button: 'Book a Beading Session',
    highlights_back_home: 'Back to Home',
    studio_location: 'DIY Perler Bead Experience · Creative Pixel Art',
    pricing_title: 'Pricing',
    pricing_card_title: 'Pricing',
    pricing_note_title: 'Notes',
    pricing_note_membership: 'Membership: S$19.90/month or S$149/year.',
    pricing_note_benefits: 'Member benefits: One free DIY accessory with every piece, plus 20% off in-store purchases.',
    pricing_note_group: 'Group rate: For 2 or more guests, non-members pay the group rate and members pay the member rate.',
    pricing_note_weekend: 'Weekends & public holidays: A 10% service charge applies to all prices.',
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
    booking_closed_title: 'Online Booking Coming Soon',
    booking_closed_desc: 'We are getting the studio ready. Online booking will open soon—thank you for your patience.',
    label_date_select: 'Select Date',
    label_time_select: 'Arrival Time',
    label_duration_select: 'Expected Duration',
    label_people_select: 'Number of People',
    label_table_select: 'Choose Seats',
    table_select_hint: 'Choose an arrival time first. Larger groups can combine multiple tables.',
    table_select_time_first: 'Choose an arrival time to view seats',
    table_loading: 'Loading seat availability…',
    table_available: 'Available',
    table_selected: 'Selected',
    table_occupied: 'Occupied',
    table_empty: 'No seats are currently available',
    label_personal_info: 'Your Details',
    unit_min: 'min',
    unit_person: 'people',
    people_note: 'For 5+ people, please note in the Special Instructions',
    opt_daypass: 'All-Day Pass',
    opt_one_hour: '1 Hour',
    opt_four_hours: '4 Hours',
    btn_confirm: 'Confirm',
    btn_submitting: 'Submitting...',
    placeholder_name: 'Your Name',
    placeholder_phone: 'Your Phone',
    placeholder_email: 'Email for confirmation',
    placeholder_notes: 'Special Instructions',
    success_title: '✓ Booking Submitted!',
    success_desc: "Your booking is confirmed. Save the booking code; if this email has an account, the booking is linked automatically.",
    error_title: '⚠️ Submission Failed',
    error_desc: 'Sorry, there was a problem. Please try again later.',
    social_xhs: 'RedNote',
    social_wechat: 'WeChat',
    footer_location_title: 'Our Location',
    footer_social_title: 'Social Media',
    footer_hours_title: 'Opening Hours',
    footer_hours_note: 'Open daily, including public holidays',
    wechat_scan_tip: 'Scan to follow our WeChat Account',
    today: 'Today',
    tomorrow: 'Tomorrow',
    mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun'
  }
}

export function t(key) {
  const override = state.store?.siteContent?.translations?.[state.lang]?.[key]
  return typeof override === 'string' ? override : (translations[state.lang]?.[key] ?? key)
}

export function siteMedia(key, fallback = null) {
  const value = state.store?.siteContent?.media?.[key]
  return value == null || value === '' ? fallback : value
}

export function siteLink(key, fallback = '') {
  const value = state.store?.siteContent?.links?.[key]
  return typeof value === 'string' ? value : fallback
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
  const [storeResult, statusResult] = await Promise.allSettled([
    fetch('/api/stores/1'),
    fetch('/api/appointments/status')
  ])
  if (storeResult.status === 'fulfilled' && storeResult.value.ok) {
    state.store = await storeResult.value.json()
  }
  if (statusResult.status === 'fulfilled' && statusResult.value.ok) {
    const status = await statusResult.value.json()
    state.bookingEnabled = status.enabled === true
  } else {
    state.bookingEnabled = false
  }
  if (state.store?.name) {
    const configuredTitle = state.store.siteContent?.meta?.title
    document.title = configuredTitle || `${state.store.name} | DIY Bead Workshop`
    const description = state.store.siteContent?.meta?.description
    if (description) {
      let meta = document.querySelector('meta[name="description"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = 'description'
        document.head.appendChild(meta)
      }
      meta.content = description
    }
  }
  return state.store
}

export async function fetchAvailability(date) {
  const r = await fetch(`/api/appointments/availability?storeId=1&date=${date}`)
  if (!r.ok) throw new Error('Availability request failed')
  return r.json()
}

export function createAppointment(dto) {
  return fetch('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto)
  })
}

export const featuredHighlights = [
  { src: 'photos/xhs-studio.jpg', altZh: 'IDOL BEADS 拼豆工作室', altEn: 'IDOL BEADS studio' },
  { src: 'photos/xhs-character-wall.jpg', altZh: '拼豆角色作品墙', altEn: 'Perler bead character creations' },
  { src: 'photos/xhs-display-wall.jpg', altZh: '拼豆作品展示墙', altEn: 'Perler bead creation display' }
]

export const allHighlights = [
  'photos/xhs-bead-colors.jpg',
  'photos/xhs-price-list.jpg',
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

export const defaultReviews = [
  {
    image: '/photos/xhs-studio.jpg',
    altZh: 'IDOL Beads 宽敞明亮的拼豆工作室',
    quoteZh: '终于在新加坡找到环境舒服、桌面宽敞的拼豆店。工作日可以直接 walk in，安排起来很方便。',
    altEn: 'The bright and spacious IDOL Beads studio',
    quoteEn: 'A bright, comfortable bead studio in Singapore with plenty of workspace. Weekday walk-ins make it especially easy to visit.'
  },
  {
    image: '/photos/xhs-character-wall.jpg',
    altZh: 'IDOL Beads 顾客拼豆作品展示墙',
    quoteZh: '牛车水里的宝藏拼豆店，常见角色和特殊烫款式都很丰富，选图的时候就已经很快乐。',
    altEn: 'Customer bead creations displayed at IDOL Beads',
    quoteEn: 'A Chinatown gem filled with character ideas and special finishing styles. Choosing a design is part of the fun.'
  },
  {
    image: '/photos/xhs-display-wall.jpg',
    altZh: 'IDOL Beads 拼豆作品与工具陈列',
    quoteZh: '从豆板、豆铲到豆针都好看又顺手，颜色摆放清楚，慢慢拼一下午也很放松。',
    altEn: 'Bead creations and tools displayed at IDOL Beads',
    quoteEn: 'The boards, scoops, pens and neatly arranged colours are lovely to use—a relaxing place to spend a creative afternoon.'
  }
]

export const defaultSiteMedia = {
  logo: '/photos/idol-logo.png',
  heroBackground: '/photos/indoor_1.webp',
  banners: [1, 2, 3, 4, 5, 6].map((n) => `/photos/banner-${n}.webp`),
  featureIcons: [1, 2, 3, 4].map((n) => `/photos/feat-icon-${n}.png`),
  featuredHighlights: featuredHighlights.map((item) => `/${item.src}`),
  galleryImages: [
    ...featuredHighlights.map((item) => `/${item.src}`),
    ...allHighlights
      .filter((src) => src !== 'photos/xhs-price-list.jpg')
      .map((src) => `/${src}`)
  ]
}
