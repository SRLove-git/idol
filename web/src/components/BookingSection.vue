<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { defaultSiteMedia, siteMedia, state, t, addMinutes, loadStore, fetchAvailability, createAppointment } from '../store.js'

defineProps({
  standalone: { type: Boolean, default: false }
})

const dates = ref([])
const timeSlots = ref([])
const availability = ref([])
const availabilityLoading = ref(false)
const availabilityError = ref('')
const selected = reactive({ date: '', startTime: '', duration: 1, people: 1, bookingType: 'hourly' })
const customDurationActive = ref(false)
const customDuration = ref(2)
const customPeopleActive = ref(false)
const customPeople = ref(5)
const form = reactive({ name: '', phone: '', email: '', notes: '' })
const submitting = ref(false)
const confirming = ref(false)
const validationMsg = ref('')
const successNotice = ref(false)
const accountUser = ref(null)
const membership = ref(null)
const success = ref(false)
const bookingResult = ref(null)
const errorMsg = ref('')
let availabilityRequestId = 0
const logo = computed(() => siteMedia('logo', defaultSiteMedia.logo))
const BOOKING_WINDOW_DAYS = 14

const sixHourPackage = computed(() =>
  state.store?.packages?.find((item) => Number(item.hours) === 6 && item.enabled !== false)
)
const durationOptions = computed(() => [
  { key: 'hourly-1', bookingType: 'hourly', hours: 1, label: t('opt_one_hour') },
  { key: 'package-6', bookingType: 'package', hours: 6, label: t('opt_six_hours') },
  { key: 'all-day', bookingType: 'all_day', hours: null, label: t('opt_daypass') }
])
const peopleOptions = [1, 2, 3, 4]
const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const storeTables = computed(() =>
  [...(state.store?.tables || [])]
    .filter((table) => table.enabled !== false)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true }))
)

const bookingWindow = computed(() => {
  if (!selected.date) return null
  const [open = '10:00', close = '21:00'] = (state.store?.businessHours || '10:00-21:00').split('-')
  if (selected.bookingType === 'all_day') return { startTime: open, endTime: close }
  if (!selected.startTime) return null
  return {
    startTime: selected.startTime,
    endTime: addMinutes(selected.startTime, selected.duration * 60)
  }
})

const totalTableCapacity = computed(() =>
  storeTables.value.reduce((total, table) => total + Number(table.capacity || 0), 0)
)
const maxDurationHours = computed(() => {
  const [open = '10:00', close = '21:00'] = (state.store?.businessHours || '10:00-21:00').split('-')
  const toMinutes = (value) => {
    const [h, m] = value.split(':').map(Number)
    return h * 60 + m
  }
  return Math.max(1, Math.floor((toMinutes(close) - toMinutes(open)) / 60))
})

function tableAvailableForWindow(table, startTime, endTime) {
  const snapshot = availability.value.find((item) => Number(item.id) === Number(table.id))
  return !(snapshot?.bookedWindows || []).some(
    (item) => item.startTime < endTime && item.endTime > startTime
  )
}

function timeSlotCapacity(startTime) {
  if (!startTime || availabilityLoading.value || availabilityError.value) return null
  const endTime = addMinutes(startTime, selected.duration * 60)
  return storeTables.value.filter((table) => tableAvailableForWindow(table, startTime, endTime)).length
}

function timeSlotCanFit(startTime) {
  if (!startTime || availabilityLoading.value || availabilityError.value) return false
  const endTime = addMinutes(startTime, selected.duration * 60)
  const capacity = storeTables.value
    .filter((table) => tableAvailableForWindow(table, startTime, endTime))
    .reduce((total, table) => total + Number(table.capacity || 0), 0)
  return capacity >= selected.people
}

function timeCapacityLabel(time) {
  const capacity = timeSlotCapacity(time)
  if (capacity == null) return '…'
  if (capacity === 0) return t('time_full')
  if (capacity === 1) return t('time_capacity_one')
  return t('time_capacity').replace('{count}', String(capacity))
}
const selectedDurationLabel = computed(() => {
  if (selected.bookingType === 'all_day') return t('opt_daypass')
  if (selected.bookingType === 'package') return t('opt_six_hours')
  return t('custom_duration_value').replace('{count}', String(selected.duration))
})
const selectedTimeLabel = computed(() => {
  const window = bookingWindow.value
  return window ? `${window.startTime} – ${window.endTime}` : ''
})
const memberActive = computed(() => membership.value?.status === 'active')
const membershipLabel = computed(() => {
  if (!accountUser.value) return ''
  if (memberActive.value) return state.lang === 'zh' ? `有效会员 · ${membership.value.levelName}` : `Active member · ${membership.value.levelName}`
  return state.lang === 'zh' ? '已登录 · 普通用户' : 'Signed in · Standard account'
})
const normalizedPhone = computed(() => form.phone.trim().replace(/[\s-]/g, ''))
const formattedPhone = computed(() => {
  const value = normalizedPhone.value
  return /^\+65\d{8}$/.test(value) ? `${value.slice(0, 3)} ${value.slice(3, 7)} ${value.slice(7)}` : form.phone.trim()
})

async function loadAccountMembership() {
  try {
    const response = await fetch('/api/auth/me')
    if (!response.ok) return
    accountUser.value = await response.json()
    form.name = accountUser.value.nickname || accountUser.value.username || ''
    form.email = accountUser.value.email || ''
    const memberResponse = await fetch('/api/members/me')
    if (memberResponse.ok) membership.value = await memberResponse.json()
  } catch {
    accountUser.value = null
    membership.value = null
  }
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildDates() {
  const today = new Date()
  const todayStr = toDateStr(today)
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  const tmrStr = toDateStr(tomorrow)
  const list = []
  let i = 0
  while (list.length < BOOKING_WINDOW_DAYS) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
    const dateStr = toDateStr(d)
    let label = t(dayKeys[d.getDay()])
    if (dateStr === todayStr) label = t('today')
    else if (dateStr === tmrStr) label = t('tomorrow')
    list.push({ date: dateStr, num: d.getDate(), label })
    i++
  }
  dates.value = list
  if (list.length && !selected.date) selectDate(list[0].date)
}

function buildTimeSlots() {
  if (selected.bookingType === 'all_day') {
    timeSlots.value = []
    selected.startTime = ''
    return
  }
  const [open = '10:00', close = '21:00'] = (state.store?.businessHours || '10:00-21:00').split('-')
  const toMinutes = (value) => {
    const [h, m] = value.split(':').map(Number)
    return h * 60 + m
  }
  const startMin = toMinutes(open)
  const lastStartMin = toMinutes(close) - selected.duration * 60
  const now = new Date()
  const isToday = selected.date === toDateStr(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const slots = []
  for (let minutes = startMin; minutes <= lastStartMin; minutes += 30) {
    // 今天不再显示已经开始的时段；未来日期保持完整。
    if (isToday && minutes <= nowMinutes) continue
    slots.push(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`)
  }
  timeSlots.value = slots
  if (!slots.includes(selected.startTime)) selected.startTime = ''
}

function resetTimeSelection() {
  selected.startTime = ''
}

async function refreshAvailability() {
  const requestId = ++availabilityRequestId
  resetTimeSelection()
  availabilityError.value = ''
  if (!selected.date || !state.bookingEnabled) {
    availability.value = []
    return
  }
  availabilityLoading.value = true
  try {
    const items = await fetchAvailability(selected.date)
    if (requestId === availabilityRequestId) {
      availability.value = Array.isArray(items) ? items : (items.items || [])
    }
  } catch {
    if (requestId === availabilityRequestId) {
      availability.value = []
      availabilityError.value = state.lang === 'zh'
        ? '桌位状态加载失败，请稍后重试'
        : 'Could not load seat availability. Please try again.'
    }
  } finally {
    if (requestId === availabilityRequestId) {
      availabilityLoading.value = false
      if (selected.startTime && timeSlotCapacity(selected.startTime) === 0) {
        selected.startTime = ''
      }
    }
  }
}

function selectDate(dateStr) {
  validationMsg.value = ''
  selected.date = dateStr
  selected.startTime = ''
  buildTimeSlots()
  void refreshAvailability()
}

function selectTime(time) {
  if (timeSlotCapacity(time) === 0) return
  validationMsg.value = ''
  selected.startTime = time
}

function selectDuration(option) {
  validationMsg.value = ''
  customDurationActive.value = false
  selected.bookingType = option.bookingType
  selected.duration = option.hours || 1
  buildTimeSlots()
  resetTimeSelection()
}

function applyCustomDuration(clamp = false) {
  let hours = Number(customDuration.value)
  if (clamp) {
    hours = Math.min(maxDurationHours.value, Math.max(1, Math.round(hours || 1)))
    customDuration.value = hours
  }
  if (!Number.isInteger(hours) || hours < 1 || hours > maxDurationHours.value) return
  validationMsg.value = ''
  selected.bookingType = 'hourly'
  selected.duration = hours
  buildTimeSlots()
  resetTimeSelection()
}

function selectCustomDuration() {
  customDurationActive.value = true
  applyCustomDuration(true)
}

function selectPeople(people) {
  validationMsg.value = ''
  customPeopleActive.value = false
  selected.people = people
  resetTimeSelection()
}

function applyCustomPeople(clamp = false) {
  let people = Number(customPeople.value)
  const maximum = Math.max(1, totalTableCapacity.value || 20)
  if (clamp) {
    people = Math.min(maximum, Math.max(1, Math.round(people || 1)))
    customPeople.value = people
  }
  if (!Number.isInteger(people) || people < 1 || people > maximum) return
  validationMsg.value = ''
  selected.people = people
  resetTimeSelection()
}

function selectCustomPeople() {
  customPeopleActive.value = true
  applyCustomPeople(true)
}

function windowHasCapacity(window) {
  if (!window) return false
  return storeTables.value
    .filter((table) => tableAvailableForWindow(table, window.startTime, window.endTime))
    .reduce((total, table) => total + Number(table.capacity || 0), 0) >= selected.people
}

function validateBooking() {
  validationMsg.value = ''
  if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
    validationMsg.value = t('booking_validation_personal')
    return false
  }
  if (!/^\+65[89]\d{7}$/.test(normalizedPhone.value)) {
    validationMsg.value = t('booking_validation_phone')
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
    validationMsg.value = t('booking_validation_email')
    return false
  }
  if (selected.bookingType !== 'all_day' && !selected.startTime) {
    validationMsg.value = t('booking_validation_time')
    return false
  }
  const window = bookingWindow.value
  if (window && !windowHasCapacity(window)) {
    validationMsg.value = t('booking_validation_availability')
    return false
  }
  return true
}

function reviewBooking() {
  errorMsg.value = ''
  if (!validateBooking()) return
  confirming.value = true
}

function closeConfirmation() {
  if (!submitting.value) confirming.value = false
}

async function submit() {
  errorMsg.value = ''
  if (!validateBooking()) {
    confirming.value = false
    return
  }

  submitting.value = true
  try {
    if (!state.store) await loadStore()
    const store = state.store
    const bookingType = selected.bookingType
    const durationHours = bookingType === 'all_day' ? null : selected.duration
    const selectedPackage = bookingType === 'package' ? sixHourPackage.value : null
    if (bookingType === 'package' && !selectedPackage) {
      throw new Error(state.lang === 'zh' ? '6 小时套餐暂不可用，请稍后再试' : 'The 6-hour package is temporarily unavailable.')
    }

    const avail = await fetchAvailability(selected.date)
    availability.value = Array.isArray(avail) ? avail : (avail.items || [])
    const hours = (store?.businessHours || '10:00-21:00').split('-')
    const startTime = bookingType === 'all_day' ? hours[0] : selected.startTime
    const endTime = bookingType === 'all_day' ? hours[1] : addMinutes(selected.startTime, durationHours * 60)

    if (!windowHasCapacity({ startTime, endTime })) {
      selected.startTime = ''
      throw new Error(state.lang === 'zh' ? '该时段刚刚约满，请重新选择时间' : 'This time has just filled up. Please choose another time.')
    }

    const dto = {
      storeId: 1,
      date: selected.date,
      peopleCount: selected.people,
      bookingType,
      payMethod: 'wechat',
      guestName: form.name.trim(),
      guestEmail: form.email.trim().toLowerCase(),
      note: [form.notes, `电话 ${formattedPhone.value}`].filter(Boolean).join(' | ')
    }
    if (bookingType === 'hourly') {
      dto.startTime = selected.startTime
      dto.durationHours = durationHours
    } else if (bookingType === 'package') {
      dto.startTime = selected.startTime
      dto.packageId = selectedPackage.id
    }

    const res = await createAppointment(dto)
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || t('error_desc'))
    bookingResult.value = data
    confirming.value = false
    success.value = true
    successNotice.value = true
    window.setTimeout(() => { successNotice.value = false }, 4500)
  } catch (err) {
    confirming.value = false
    errorMsg.value = err.message || t('error_desc')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    state.store ? Promise.resolve() : loadStore(),
    loadAccountMembership()
  ])
  buildDates()
})

watch(() => state.lang, buildDates)
</script>

<template>
  <section id="booking" class="booking" :class="{ 'booking-standalone': standalone }">
    <div class="container">
      <h2 class="section-title">
        <span>{{ t('booking_title') }}</span>
        <img src="/photos/booking-title.png" alt="Booking" class="title-icon">
      </h2>
      <div v-if="!state.bookingEnabled" class="booking-closed-card" role="status">
        <span>OPENING SOON</span>
        <h3>{{ t('booking_closed_title') }}</h3>
        <p>{{ t('booking_closed_desc') }}</p>
        <a class="btn btn-secondary" href="/">{{ t('highlights_back_home') }}</a>
      </div>
      <div v-else-if="!success" class="booking-app">
        <div class="booking-header">
          <div class="studio-mini-card">
            <img :src="logo" alt="Studio" class="studio-thumb">
            <div class="studio-info">
              <h3>{{ state.store?.name || 'IDOL BEADS' }}</h3>
              <p>{{ t('studio_location') }}</p>
            </div>
          </div>
        </div>

        <div class="booking-body booking-schedule">
          <div class="section-label"><span class="icon">📅</span> <span>{{ t('label_date_select') }}</span></div>
          <div class="date-scroll-wrapper">
            <div class="date-list">
              <div
                v-for="d in dates"
                :key="d.date"
                class="date-card"
                :class="{ active: selected.date === d.date }"
                @click="selectDate(d.date)"
              >
                <div class="day-name">{{ d.label }}</div>
                <div class="date-num">{{ d.num }}</div>
              </div>
            </div>
          </div>

          <div class="section-label"><span class="icon">⌛</span> <span>{{ t('label_duration_select') }}</span></div>
          <div class="grid-selector duration-grid">
            <button
              v-for="d in durationOptions"
              :key="d.key"
              type="button"
              class="grid-btn"
              :class="{ active: selected.bookingType === d.bookingType && !(d.bookingType === 'hourly' && customDurationActive) }"
              @click="selectDuration(d)"
            >{{ d.label }}</button>
            <button
              type="button"
              class="grid-btn"
              :class="{ active: customDurationActive }"
              @click="selectCustomDuration"
            >{{ t('opt_custom_duration') }}</button>
          </div>
          <div v-if="customDurationActive" class="custom-option-panel">
            <label for="custom-duration">{{ t('custom_duration_label') }}</label>
            <div class="custom-option-input">
              <input
                id="custom-duration"
                v-model.number="customDuration"
                type="number"
                inputmode="numeric"
                min="1"
                :max="maxDurationHours"
                step="1"
                @input="applyCustomDuration()"
                @change="applyCustomDuration(true)"
              >
              <span>{{ t('unit_hour') }}</span>
            </div>
            <small>{{ t('custom_duration_hint').replace('{max}', String(maxDurationHours)) }}</small>
          </div>

          <div class="section-label"><span class="icon">👥</span> <span>{{ t('label_people_select') }}</span></div>
          <div class="grid-selector people-grid">
            <button
              v-for="p in peopleOptions"
              :key="p"
              type="button"
              class="grid-btn"
              :class="{ active: selected.people === p && !customPeopleActive }"
              @click="selectPeople(p)"
            >{{ p }} <span>{{ t(p === 1 ? 'unit_person_one' : 'unit_person') }}</span></button>
            <button
              type="button"
              class="grid-btn"
              :class="{ active: customPeopleActive }"
              @click="selectCustomPeople"
            >{{ t('opt_custom_people') }}</button>
          </div>
          <div v-if="customPeopleActive" class="custom-option-panel">
            <label for="custom-people">{{ t('custom_people_label') }}</label>
            <div class="custom-option-input">
              <input
                id="custom-people"
                v-model.number="customPeople"
                type="number"
                inputmode="numeric"
                min="1"
                :max="Math.max(1, totalTableCapacity || 20)"
                step="1"
                @input="applyCustomPeople()"
                @change="applyCustomPeople(true)"
              >
              <span>{{ t('unit_person') }}</span>
            </div>
            <small>{{ t('custom_people_hint').replace('{max}', String(Math.max(1, totalTableCapacity || 20))) }}</small>
          </div>
          <p class="section-note">{{ t('people_note') }}</p>

          <template v-if="selected.bookingType !== 'all_day'">
            <div class="section-label"><span class="icon">⏰</span> <span>{{ t('label_time_select') }}</span></div>
            <div v-if="availabilityLoading" class="seat-picker-message">{{ t('table_loading') }}</div>
            <div v-else-if="availabilityError" class="seat-picker-message is-error">{{ availabilityError }}</div>
            <div v-else class="grid-selector time-grid">
              <button
                v-for="s in timeSlots"
                :key="s"
                type="button"
                class="grid-btn"
                :class="{ active: selected.startTime === s }"
                :disabled="!timeSlotCanFit(s)"
                @click="selectTime(s)"
              ><strong>{{ s }}</strong><small>{{ timeCapacityLabel(s) }}</small></button>
            </div>
          </template>
          <div v-else class="auto-table-note">
            <strong>{{ t('booking_table_auto') }}</strong>
            <small>{{ t('booking_pending_email_tip') }}</small>
          </div>
        </div>

        <div class="booking-body booking-details">
          <div v-if="accountUser" class="booking-member-notice" :class="{ 'is-active': memberActive }">
            <span class="booking-member-icon">{{ memberActive ? '★' : '✓' }}</span>
            <div>
              <strong>{{ membershipLabel }}</strong>
              <small>{{ memberActive ? (state.lang === 'zh' ? '本次预约将自动使用会员价，后台会显示会员标记。' : 'Member pricing will be applied and staff will see your member badge.') : (state.lang === 'zh' ? '开通会员后可享会员价。' : 'Activate membership to receive member pricing.') }}</small>
            </div>
          </div>
          <div class="section-label personal-info-label"><span class="icon">👤</span> <span>{{ t('label_personal_info') }}</span></div>
          <div class="personal-info-form">
            <div class="form-row">
              <input v-model="form.name" type="text" :placeholder="t('placeholder_name')" required @input="validationMsg = ''">
              <input v-model="form.phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" :placeholder="t('placeholder_phone')" required @input="validationMsg = ''">
            </div>
            <input v-model="form.email" type="email" :placeholder="t('placeholder_email')" required @input="validationMsg = ''">
            <textarea v-model="form.notes" rows="2" :placeholder="t('placeholder_notes')"></textarea>
          </div>
        </div>

        <div class="booking-footer">
          <p v-if="validationMsg" class="booking-validation-error" role="alert">{{ validationMsg }}</p>
          <button type="button" class="btn btn-submit" :disabled="submitting" @click="reviewBooking">
            {{ t('btn_review_booking') }}
          </button>
        </div>
      </div>

      <div
        v-if="confirming"
        class="booking-confirm-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="t('booking_review_title')"
        @click.self="closeConfirmation"
      >
        <div class="booking-confirm-card">
          <button
            type="button"
            class="booking-confirm-close"
            :aria-label="t('booking_review_cancel')"
            :disabled="submitting"
            @click="closeConfirmation"
          >&times;</button>
          <span class="booking-confirm-kicker">BOOKING REVIEW</span>
          <h3>{{ t('booking_review_title') }}</h3>
          <p class="booking-confirm-tip">{{ t('booking_review_tip') }}</p>
          <dl class="booking-confirm-list">
            <div><dt>{{ t('booking_review_date') }}</dt><dd>{{ selected.date }}</dd></div>
            <div><dt>{{ t('booking_review_time') }}</dt><dd>{{ selectedTimeLabel }}</dd></div>
            <div><dt>{{ t('booking_review_duration') }}</dt><dd>{{ selectedDurationLabel }}</dd></div>
            <div><dt>{{ t('booking_review_people') }}</dt><dd>{{ selected.people }} {{ t(selected.people === 1 ? 'unit_person_one' : 'unit_person') }}</dd></div>
            <div class="is-important"><dt>{{ t('booking_review_tables') }}</dt><dd>{{ t('booking_table_auto') }}</dd></div>
            <div v-if="accountUser"><dt>{{ state.lang === 'zh' ? '会员身份' : 'Membership' }}</dt><dd>{{ membershipLabel }}</dd></div>
            <div><dt>{{ t('booking_review_contact') }}</dt><dd>{{ form.name.trim() }} · {{ formattedPhone }}<br>{{ form.email.trim().toLowerCase() }}</dd></div>
          </dl>
          <div class="booking-confirm-actions">
            <button type="button" class="btn btn-secondary" :disabled="submitting" @click="closeConfirmation">
              {{ t('booking_review_cancel') }}
            </button>
            <button type="button" class="btn btn-primary" :disabled="submitting" @click="submit">
              {{ submitting ? t('btn_submitting') : t('booking_review_submit') }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="state.bookingEnabled && success" class="success-message">
        <h3>{{ t('success_title') }}</h3>
        <p>{{ t('success_desc') }}</p>
        <div v-if="bookingResult?.code" class="booking-code">
          <span>{{ t('booking_code_label') }}</span>
          <strong>{{ bookingResult.code }}</strong>
        </div>
        <div class="success-actions">
          <a class="btn btn-primary" href="/account">{{ t('booking_view_account') }}</a>
          <a class="btn btn-secondary" href="/">{{ t('back_home') }}</a>
        </div>
      </div>
      <div v-if="successNotice" class="booking-success-toast" role="status" aria-live="polite">
        <span>✓</span>
        <div><strong>{{ t('success_title') }}</strong><small>{{ t('success_desc') }}</small></div>
      </div>
      <div v-if="state.bookingEnabled && errorMsg" class="error-message">
        <h3>{{ t('error_title') }}</h3>
        <p>{{ errorMsg }}</p>
      </div>
    </div>
  </section>
</template>
