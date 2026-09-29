const scriptURL = 'https://script.google.com/macros/s/AKfycbz9lY9Fu-EnGobefK_5R4-vgtHtA2G9nz1cU6ZHXn6jdcYb4XCX21_9vJsSwDkK9laEwA/exec';
const languageSelect = document.getElementById('languageSelect');
const totalPriceDisplay = document.getElementById('totalPriceDisplay');
const confirmBookingBtn = document.getElementById('confirmBookingBtn');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const errorText = errorMessage.querySelector('p');

// Google Ads conversion tracking for successful workshop bookings
function trackBookingConversion() {
    if (typeof window.gtag !== 'function') {
        console.warn('Google Ads conversion was not sent because gtag is unavailable.');
        return;
    }

    window.gtag('event', 'conversion', {
        send_to: 'AW-18091569661/dpPACKLD6dkcEP3j3bJD',
        value: 1.0,
        currency: 'USD'
    });
}

// State
let bookingState = {
    date: '',
    startTime: '',
    duration: 1,
    people: 1,
    isAllDay: false
};

// Translations
const translations = {
    zh: {
        nav_home: "首页",
        nav_pricing: "价位表",
        nav_booking: "预约体验",
        nav_social: "社交媒体",
        nav_brand: "豆豆王国",
        hero_title: "豆豆王国",
        hero_desc: "拼豆工作室",
        hero_slogan: "一粒粒豆子，组成属于自己的王国",
        cta_booking: "预约体验",
        cta_pricing: "查看价位",
        reviews_title: "豆豆王国顾客评价",
        member_title: "免费奖励制度",
        member_rule_1: "每消费 $1 = 1积分",
        member_rule_2: "50 积分可减 $5",
        member_rule_3: "100 积分可减 $15",
        member_rule_4: "积分可在下次光顾时兑换",
        member_rule_5: "400积分可兑换任意一天通行证",
        feat1_title: "专业烫印",
        feat1_desc: "店内使用全自动烫画机，默认单面无孔，也提供特殊烫。工作人员会帮你完成最后的烫印步骤，确保作品完美。",
        feat2_title: "免费工具",
        feat2_desc: "店内工具有大小豆板，单双针豆笔，豆铲，立豆盘，尖头弯头镊子等。",
        feat3_title: "自定成品",
        feat3_desc: "成品可做钥匙扣，冰箱贴，手机链，风铃，Crocs鞋扣等。",
        feat4_title: "分享特惠",
        feat4_desc: "在任何社交媒体上分享，即可免费获取 30 积分。",
        highlights_title: "拼豆精选",
        btn_view_details: "查看详情",
        studio_location: "手工拼豆制作体验 · 创意像素艺术",
        pricing_title: "价位表",
        hourly_pricing: "按时计费",
        daypass_pricing: "全天通票",
        th_people: "人数",
        th_price: "价格",
        td_solo_label: "单人",
        td_duo_label: "双人",
        summer_discount_label: "夏日优惠",
        summer_booking_btn: "立即预约座位",
        summer_booking_sub: "9月21日 · 18:00–20:00",
        th_date: "日期",
        td_wed_thu: "周三 - 周四",
        td_fri_sun: "周五 - 周日",
        booking_title: "预约体验",
        label_date_select: "选择日期",
        label_time_select: "到店时间",
        label_duration_select: "预期消费时长",
        label_people_select: "预约人数",
        unit_min: "分钟",
        unit_person: "人",
        people_note: "超过4人请在下方特别说明中备注",
        opt_daypass: "全天通票",
        up_from: "起",
        total_amount: "合计金额",
        btn_confirm: "确认预约",
        btn_submitting: "提交中...",
        btn_checking: "正在检查名额...",
        placeholder_name: "您的姓名",
        placeholder_phone: "您的电话",
        placeholder_email: "你的邮箱",
        placeholder_notes: "特别说明",
        success_title: "✓ 预约已提交！",
        success_desc: "我们已收到您的预约请求，系统将自动同步至工作室日历。请检查您的邮箱获取确认通知。",
        error_title: "⚠️ 提交失败",
        error_desc: "抱歉，预约提交时出现问题。请稍后再试或通过社交媒体联系我们。",
        social_xhs: "小红书",
        social_wechat: "微信公众号",
        footer_location_title: "店铺地址",
        footer_social_title: "社交媒体",
        footer_hours_title: "营业时间",
        footer_hours_mon_tue: "周一至周二：休息",
        footer_hours_wed_thu: "周三至周四：中午12:00至下午7:00",
        footer_hours_fri_sun: "周五至周日：中午12:00至晚上9:00",
        wechat_scan_tip: "扫一扫，关注我们的微信公众号",
        footer_name: "Beads Land",
        today: "今天",
        tomorrow: "明天",
        mon: "周一", tue: "周二", wed: "周三", thu: "周四", fri: "周五", sat: "周六", sun: "周日"
    },
    en: {
        nav_home: "Home",
        nav_pricing: "Pricing",
        nav_booking: "Booking",
        nav_social: "Social",
        nav_brand: "Beads land",
        hero_title: "Beads land",
        hero_desc: "Perler Bead Workshop",
        hero_slogan: "Bead by bead, building a kingdom of your own",
        cta_booking: "Book Now",
        cta_pricing: "View Pricing",
        reviews_title: "Beads Land Customer Reviews",
        member_title: "Free rewards Program",
        member_rule_1: "Earn 1 point for every $1 spent",
        member_rule_2: "50 points = $5 off",
        member_rule_3: "100 points = $15 off",
        member_rule_4: "Points can be redeemed upon next visit",
        member_rule_5: "400 points = Any Single Day Pass",
        feat1_title: "Professional Ironing",
        feat1_desc: "We use fully automatic heat presses. Default is single-sided no-hole, special ironing also available. Staff will assist with final steps.",
        feat2_title: "Free Tools",
        feat2_desc: "Various boards, single/double needle bead pens, scrapers, plates, and tweezers available for use.",
        feat3_title: "Custom Products",
        feat3_desc: "Can be made into keychains, fridge magnets, phone straps, wind chimes, Crocs jibbitz, etc.",
        feat4_title: "Sharing Offer",
        feat4_desc: "Share on any social media platform and receive 30 free points added to your account.",
        highlights_title: "Perler Bead Highlights",
        btn_view_details: "View Details",
        pricing_title: "Pricing",
        hourly_pricing: "Hourly Rate",
        daypass_pricing: "Day Pass",
        th_people: "People",
        th_price: "Price",
        td_solo_label: "Solo",
        td_duo_label: "Duo",
        summer_discount_label: "Summer Discount",
        summer_booking_btn: "Reserve Seats Now",
        summer_booking_sub: "Sep 21 · 6:00 PM–8:00 PM",
        th_date: "Date",
        td_wed_thu: "Wed - Thu",
        td_fri_sun: "Fri - Sun",
        booking_title: "Book a Session",
        label_date_select: "Select Date",
        label_time_select: "Arrival Time",
        label_duration_select: "Expected Duration",
        label_people_select: "Number of People",
        unit_min: "min",
        unit_person: "people",
        people_note: "For 5+ people, please note in the Special Instructions",
        opt_daypass: "All-Day Pass",
        up_from: "up",
        total_amount: "Total",
        btn_confirm: "Confirm",
        btn_submitting: "Submitting...",
        btn_checking: "Checking slots...",
        placeholder_name: "Your Name",
        placeholder_phone: "Your Phone",
        placeholder_email: "Email for confirmation",
        placeholder_notes: "Special Instructions",
        success_title: "✓ Booking Submitted!",
        success_desc: "We've received your request and synced it to our calendar. Check your email for confirmation.",
        error_title: "⚠️ Submission Failed",
        error_desc: "Sorry, there was a problem. Please try again later.",
        social_xhs: "RedNote",
        social_wechat: "WeChat",
        footer_location_title: "Our Location",
        footer_social_title: "Social Media",
        footer_hours_title: "Opening Hours",
        footer_hours_mon_tue: "Monday – Tuesday: Closed",
        footer_hours_wed_thu: "Wednesday – Thursday: 12:00 PM – 6:00 PM",
        footer_hours_fri_sun: "Friday – Sunday: 12:00 PM – 8:00 PM",
        wechat_scan_tip: "Scan to follow our WeChat Account",
        studio_location: "DIY Perler Bead Experience · Creative Pixel Art",
        footer_name: "Beads Land",
        today: "Today",
        tomorrow: "Tom",
        mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun"
    }
};

// 1. Language Update
function updateLanguage(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) el.innerText = translations[lang][key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang][key]) el.placeholder = translations[lang][key];
    });
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    localStorage.setItem('preferred_lang', lang);
    renderDates(); // Re-render dates for "Today/Tomorrow" labels
}

languageSelect.addEventListener('change', (e) => updateLanguage(e.target.value));
const savedLang = localStorage.getItem('preferred_lang') || 'zh';
languageSelect.value = savedLang;
updateLanguage(savedLang);

// 2. Date Generator
function renderDates() {
    const lang = languageSelect.value;
    const dateList = document.getElementById('dateList');
    dateList.innerHTML = '';

    const today = new Date();
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const validDays = [3, 4, 5, 6, 0]; // Wed, Thu, Fri, Sat, Sun

    let count = 0;
    let i = 0;
    while (count < 7) {
        const d = new Date();
        d.setDate(today.getDate() + i);
        const dayOfWeek = d.getDay();

        if (validDays.includes(dayOfWeek)) {
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const dateNum = d.getDate();
            let dayName = translations[lang][dayNames[dayOfWeek]];

            // Basic label check for Today/Tomorrow
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            if (dateStr === todayStr) dayName = translations[lang].today;

            const tmr = new Date();
            tmr.setDate(today.getDate() + 1);
            const tmrStr = `${tmr.getFullYear()}-${String(tmr.getMonth() + 1).padStart(2, '0')}-${String(tmr.getDate()).padStart(2, '0')}`;
            if (dateStr === tmrStr) dayName = translations[lang].tomorrow;

            const card = document.createElement('div');
            card.className = `date-card ${bookingState.date === dateStr ? 'active' : ''}`;

            // Default selection
            if (!bookingState.date && count === 0) {
                card.className = 'date-card active';
                bookingState.date = dateStr;
                fetchAvailability(dateStr);
            }

            card.innerHTML = `
                <div class="day-name">${dayName}</div>
                <div class="date-num">${dateNum}</div>
            `;

            card.addEventListener('click', () => {
                document.querySelectorAll('.date-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                bookingState.date = dateStr;
                fetchAvailability(dateStr);
            });
            dateList.appendChild(card);
            count++;
        }
        i++;
        if (i > 30) break; // Safety break
    }
}

// 3. Time Grid Generator
function renderTimeGrid(occupancy = {}, limit = 18) {
    const timeGrid = document.getElementById('timeGrid');
    timeGrid.innerHTML = '';

    if (!bookingState.date) return;

    // Parse date safely to avoid timezone shifts
    const [y, m, day] = bookingState.date.split('-').map(Number);
    const d = new Date(y, m - 1, day);
    const dayOfWeek = d.getDay();

    let startHour = 12;
    let endHour = 18; // Default Wed/Thu

    if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) { // Fri/Sat/Sun
        endHour = 20;
    }

    for (let h = startHour; h < endHour; h++) {
        const intervals = ['00', '30'];
        for (let m of intervals) {

            const time = `${h}:${m}`;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `grid-btn ${bookingState.startTime === time ? 'active' : ''}`;
            btn.innerText = time;

            // Disable if full (18 people limit)
            const currentCount = occupancy[time] || 0;
            if (currentCount >= limit) {
                btn.disabled = true;
            }

            btn.addEventListener('click', () => {
                document.querySelectorAll('.time-grid .grid-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                bookingState.startTime = time;
            });
            timeGrid.appendChild(btn);
        }
    }
}

// 4. Availability Fetcher
function fetchAvailability(date) {
    if (scriptURL.includes('YOUR_GOOGLE')) return renderTimeGrid();

    // Simple loader
    const timeGrid = document.getElementById('timeGrid');
    timeGrid.innerHTML = '<div style="grid-column: span 4; font-size: 12px; color: #888;">Checking...</div>';

    fetch(`${scriptURL}?date=${date}`)
        .then(r => r.json())
        .then(res => {
            if (res.status === 'success') {
                renderTimeGrid(res.occupancy, res.limit || 18);
            } else {
                renderTimeGrid();
            }
        })
        .catch(() => renderTimeGrid());
}

// 5. Price Calculator
function calculatePrice() {
    // Price display removed from UI
    bookingState.totalPrice = 0;
}

// 6. Grid Selectors Events
document.querySelectorAll('.duration-grid .grid-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.duration-grid .grid-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.getAttribute('data-value');
        if (val === 'all-day') {
            bookingState.isAllDay = true;
            bookingState.duration = 10; // Use a high dummy value for all-day
        } else {
            bookingState.isAllDay = false;
            bookingState.duration = parseFloat(val);
        }
    });
});

document.querySelectorAll('.people-grid .grid-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.people-grid .grid-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        bookingState.people = parseInt(btn.getAttribute('data-value'));
    });
});

// 7. Submission
confirmBookingBtn.addEventListener('click', () => {
    const lang = languageSelect.value;

    // Validate
    if (!bookingState.startTime) {
        alert(lang === 'zh' ? '请选择到店时间' : 'Please select arrival time');
        return;
    }
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const notes = document.getElementById('notes').value;

    if (!name || !phone || !email) {
        alert(lang === 'zh' ? '请填写必填个人信息' : 'Please fill in required info');
        return;
    }

    if (scriptURL.includes('YOUR_GOOGLE')) {
        alert(lang === 'zh' ? '请先配置 Google Apps Script URL！' : 'Please configure GAS URL!');
        return;
    }

    // Submit
    confirmBookingBtn.disabled = true;
    confirmBookingBtn.innerText = translations[lang].btn_submitting;
    errorMessage.classList.add('hidden');

    // Calculate dynamic duration for All-Day Pass
    let finalDuration = bookingState.duration;
    if (bookingState.isAllDay && bookingState.startTime) {
        const [y, m, day] = bookingState.date.split('-').map(Number);
        const d = new Date(y, m - 1, day);
        const dayOfWeek = d.getDay();

        let closingHour = 18; // Wed/Thu
        if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
            closingHour = 20; // Fri/Sat/Sun
        }

        const startHour = parseInt(bookingState.startTime.split(':')[0], 10);
        const startMin = parseInt(bookingState.startTime.split(':')[1], 10) / 60;
        finalDuration = closingHour - (startHour + startMin);
    }

    // Never send a zero/negative duration to Google Calendar.
    if (!Number.isFinite(finalDuration) || finalDuration <= 0) {
        alert(lang === 'zh'
            ? '该到店时间已经到达或超过营业结束时间，请选择更早的时间。'
            : 'This arrival time is at or after closing. Please choose an earlier time.');
        confirmBookingBtn.disabled = false;
        confirmBookingBtn.innerText = translations[lang].btn_confirm;
        return;
    }

    // Prevent ordinary sessions from extending beyond closing time.
    if (!bookingState.isAllDay) {
        const [y, m, day] = bookingState.date.split('-').map(Number);
        const d = new Date(y, m - 1, day);
        const dayOfWeek = d.getDay();
        let closingHour = 18;
        if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) closingHour = 20;

        const [startHourText, startMinuteText] = bookingState.startTime.split(':');
        const startDecimal = parseInt(startHourText, 10) + parseInt(startMinuteText, 10) / 60;
        if (startDecimal + finalDuration > closingHour) {
            alert(lang === 'zh'
                ? '所选时长会超过营业结束时间，请选择更早的到店时间或更短的时长。'
                : 'The selected duration would run past closing. Please choose an earlier arrival time or a shorter duration.');
            confirmBookingBtn.disabled = false;
            confirmBookingBtn.innerText = translations[lang].btn_confirm;
            return;
        }
    }

    const payload = {
        ...bookingState,
        duration: finalDuration,
        name, phone, email, notes,
        service: bookingState.isAllDay ? 'Day Pass' : 'Session'
    };

    fetch(scriptURL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
    })
        .then(r => r.json())
        .then(res => {
            if (res.status === 'success') {
                // Record the conversion only after the booking API confirms success.
                trackBookingConversion();

                document.querySelector('.booking-app').classList.add('hidden');
                successMessage.classList.remove('hidden');
            } else {
                throw new Error(res.message);
            }
        })
        .catch(err => {
            confirmBookingBtn.disabled = false;
            confirmBookingBtn.innerText = translations[lang].btn_confirm;
            errorText.innerText = err.message || translations[lang].error_desc;
            errorMessage.classList.remove('hidden');
        });
});

// 8. Init
renderDates();
calculatePrice();

// WeChat Modal
const wechatLink = document.getElementById('wechatLink');
const wechatModal = document.getElementById('wechatModal');
const closeModal = document.querySelector('.close-modal');
if (wechatLink) wechatLink.addEventListener('click', () => wechatModal.classList.remove('hidden'));
if (closeModal) closeModal.addEventListener('click', () => wechatModal.classList.add('hidden'));
window.addEventListener('click', (e) => { if (e.target === wechatModal) wechatModal.classList.add('hidden'); });

// 10. Highlights Load More Logic
const openGalleryBtn = document.getElementById('openGalleryBtn');
const highlightGrid = document.querySelector('.highlight-grid');

// Complete list of image paths (starting after the first 3 already in HTML)
const allHighlights = [
    "photos/show_27.jpg",
    "photos/show_28.jpg",
    "photos/show_29.jpg",
    "photos/show_4.jpg",
    "photos/show_5.jpg",
    "photos/show_6.jpg",
    "photos/show_7.jpg",
    "photos/show_8.jpg",
    "photos/show_9.jpg",
    "photos/show_10.jpg",
    "photos/show_11.jpg",
    "photos/show_12.jpg",
    "photos/show_13.jpg",
    "photos/show_14.jpg",
    "photos/show_15.jpg",
    "photos/show_16.jpg",
    "photos/show_17.jpg",
    "photos/show_18.jpg",
    "photos/show_19.jpg",
    "photos/show_20.jpg",
    "photos/show_21.jpg",
    "photos/show_22.jpg",
    "photos/show_23.jpg",
    "photos/微信图片_20260411232112.jpg",
    "photos/微信图片_20260411232124.jpg",
    "photos/微信图片_20260411232130.jpg",
    "photos/微信图片_20260411232135.jpg",
    "photos/微信图片_20260411232139.jpg",
    "photos/微信图片_20260411232144.jpg",
    "photos/微信图片_20260411232150.jpg",
    "photos/微信图片_20260411232155.jpg",
    "photos/微信图片_20260411232159.jpg",
    "photos/微信图片_20260411232204.jpg",
    "photos/微信图片_20260411232208.jpg",
    "photos/微信图片_20260411232215.jpg",
    "photos/微信图片_20260411232219.jpg",
    "photos/微信图片_20260411232222.jpg",
    "photos/微信图片_20260411232227.jpg",
    "photos/微信图片_20260411232231.jpg",
    "photos/微信图片_20260411232250.jpg",
    "photos/微信图片_20260411232255.jpg",
    "photos/微信图片_20260411232258.jpg",
    "photos/微信图片_20260411232304.jpg",
    "photos/微信图片_20260411232315.jpg",
    "photos/微信图片_20260411232319.jpg",
    "photos/微信图片_20260411232323.jpg",
    "photos/微信图片_20260411232327.jpg",
    "photos/微信图片_20260411232331.jpg",
    "photos/微信图片_20260411232335.jpg",
    "photos/微信图片_20260411232338.jpg",
    "photos/微信图片_20260411232341.jpg",
    "photos/微信图片_20260411232345.jpg",
    "photos/微信图片_20260411232350.jpg",
    "photos/微信图片_20260411232354.jpg"
];
let shownCount = 0;

if (openGalleryBtn) {
    openGalleryBtn.addEventListener('click', () => {
        // Load the next 3 images (one row)
        const nextBatch = allHighlights.slice(shownCount, shownCount + 3);

        nextBatch.forEach(src => {
            const item = document.createElement('div');
            item.className = 'highlight-item';
            item.style.opacity = '0';
            item.innerHTML = `<img src="${src}" alt="Highlight" loading="lazy" decoding="async">`;
            highlightGrid.appendChild(item);

            // Simple fade in effect
            setTimeout(() => {
                item.style.transition = 'opacity 0.5s';
                item.style.opacity = '1';
            }, 10);
        });

        shownCount += 3;

        // Hide button if no more images
        if (shownCount >= allHighlights.length) {
            openGalleryBtn.style.display = 'none';
        }
    });
}

// 9. Horizontal Scroll Drag Support (for Desktop)
const slider = document.querySelector('.date-scroll-wrapper');
let isDown = false;
let startX;
let scrollLeft;

if (slider) {
    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        slider.classList.add('active-drag');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.classList.remove('active-drag');
    });
    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.classList.remove('active-drag');
    });
    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed
        slider.scrollLeft = scrollLeft - walk;
    });
}

/* Summer Popup */

const summerPopup =
    document.getElementById('summerPopup');

const summerPopupImage =
    document.getElementById('summerPopupImage');

const closeSummerPopup =
    document.getElementById('closeSummerPopup');

function updateSummerPopupImage() {

    const lang = languageSelect.value;

    if (lang === 'en') {

        summerPopupImage.src =
            'photos/MID_AUTUMN_EN.jpg';

    } else {

        summerPopupImage.src =
            'photos/MID_AUTUMN_CN.jpg';

    }

}

/* Auto popup when page loads */

window.addEventListener('load', () => {

    updateSummerPopupImage();

    setTimeout(() => {

        summerPopup.classList.remove('hidden');

    }, 1000);

});

/* Close popup */

if (closeSummerPopup) {

    closeSummerPopup.addEventListener('click', () => {

        summerPopup.classList.add('hidden');

    });

}

/* Update popup image on language switch */

languageSelect.addEventListener('change', () => {

    updateSummerPopupImage();

    if (summerPopup) {

        summerPopup.classList.remove('hidden');

    }

});

window.addEventListener('click', (e) => {

    if (e.target === summerPopup) {

        summerPopup.classList.add('hidden');

    }

});

const summerBookingBtn =
    document.getElementById('summerBookingBtn');

if (summerBookingBtn) {
    summerBookingBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const lang = languageSelect.value === 'en' ? 'en' : 'zh';
        window.location.href = `seat_booking.html?lang=${lang}`;
    });
}

/* Floating Summer Button */

const floatingSummerBtn =
    document.getElementById('floatingSummerBtn');

if (floatingSummerBtn) {

    floatingSummerBtn.addEventListener('click', () => {

        updateSummerPopupImage();

        summerPopup.classList.remove('hidden');

    });

}

document.addEventListener("DOMContentLoaded", () => {
    const carousel = document.querySelector(".promo-carousel-wrapper");

    if (!carousel) {
        return;
    }

    const slides = Array.from(
        carousel.querySelectorAll(".promo-slide")
    );

    const prevButton = carousel.querySelector(
        ".promo-carousel-prev"
    );

    const nextButton = carousel.querySelector(
        ".promo-carousel-next"
    );

    const dotsContainer = carousel.querySelector(
        ".promo-carousel-dots"
    );

    if (
        slides.length === 0 ||
        !prevButton ||
        !nextButton ||
        !dotsContainer
    ) {
        return;
    }

    let currentSlideIndex = 0;
    let autoplayTimer = null;

    // 每5秒自动切换
    const autoplayDelay = 5000;

    /*
     * 根据图片数量自动创建圆点
     */
    slides.forEach((slide, index) => {
        const dot = document.createElement("button");

        dot.type = "button";
        dot.className = "promo-dot";
        dot.dataset.slide = String(index);
        dot.setAttribute(
            "aria-label",
            `显示第 ${index + 1} 张图片`
        );

        if (index === 0) {
            dot.classList.add("active");
        }

        dotsContainer.appendChild(dot);
    });

    const dots = Array.from(
        dotsContainer.querySelectorAll(".promo-dot")
    );

    /*
     * 显示指定图片
     */
    function showSlide(index) {
        currentSlideIndex =
            (index + slides.length) % slides.length;

        slides.forEach((slide, slideIndex) => {
            const isActive =
                slideIndex === currentSlideIndex;

            slide.classList.toggle(
                "active",
                isActive
            );

            slide.setAttribute(
                "aria-hidden",
                String(!isActive)
            );
        });

        dots.forEach((dot, dotIndex) => {
            const isActive =
                dotIndex === currentSlideIndex;

            dot.classList.toggle(
                "active",
                isActive
            );

            dot.setAttribute(
                "aria-current",
                isActive ? "true" : "false"
            );
        });
    }

    /*
     * 下一张
     */
    function showNextSlide() {
        showSlide(currentSlideIndex + 1);
    }

    /*
     * 上一张
     */
    function showPreviousSlide() {
        showSlide(currentSlideIndex - 1);
    }

    /*
     * 开始自动播放
     */
    function startAutoplay() {
        stopAutoplay();

        autoplayTimer = window.setInterval(
            showNextSlide,
            autoplayDelay
        );
    }

    /*
     * 停止自动播放
     */
    function stopAutoplay() {
        if (autoplayTimer !== null) {
            window.clearInterval(autoplayTimer);
            autoplayTimer = null;
        }
    }

    /*
     * 点击上一张
     */
    prevButton.addEventListener("click", () => {
        showPreviousSlide();
        startAutoplay();
    });

    /*
     * 点击下一张
     */
    nextButton.addEventListener("click", () => {
        showNextSlide();
        startAutoplay();
    });

    /*
     * 点击圆点切换
     */
    dots.forEach((dot) => {
        dot.addEventListener("click", () => {
            const index = Number(dot.dataset.slide);

            if (!Number.isNaN(index)) {
                showSlide(index);
                startAutoplay();
            }
        });
    });

    /*
     * 鼠标停在轮播图上时暂停
     */
    carousel.addEventListener(
        "mouseenter",
        stopAutoplay
    );

    carousel.addEventListener(
        "mouseleave",
        startAutoplay
    );

    /*
     * 键盘焦点进入时暂停
     */
    carousel.addEventListener(
        "focusin",
        stopAutoplay
    );

    carousel.addEventListener(
        "focusout",
        startAutoplay
    );

    /*
     * 浏览器页面切换到后台时暂停
     */
    document.addEventListener(
        "visibilitychange",
        () => {
            if (document.hidden) {
                stopAutoplay();
            } else {
                startAutoplay();
            }
        }
    );

    /*
     * 初始化第一张并开始播放
     */
    showSlide(0);
    startAutoplay();
});
