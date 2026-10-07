<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { state, t, addMinutes, loadStore, fetchAvailability, createAppointment } from '../store.js'

defineProps({
  standalone: { type: Boolean, default: false }
})

const dates = ref([])
const timeSlots = ref([])
const selected = reactive({ date: '', startTime: '', duration: 1, people: 1, bookingType: 'hourly' })
const form = reactive({ name: '', phone: '', email: '', notes: '' })
const submitting = ref(false)
const success = ref(false)
const bookingResult = ref(null)
const errorMsg = ref('')

const fourHourPackage = computed(() =>
  state.store?.packages?.find((item) => Number(item.hours) === 4 && item.enabled !== false)
)
const durationOptions = computed(() => [
  { key: 'hourly-1', bookingType: 'hourly', hours: 1, label: t('opt_one_hour') },
  { key: 'package-4', bookingType: 'package', hours: 4, label: t('opt_four_hours') },
  { key: 'all-day', bookingType: 'all_day', hours: null, label: t('opt_daypass') }
])
const peopleOptions = [1, 2, 3, 4]
const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

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
  while (list.length < 7 && i <= 7) {
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
  const slots = []
  for (let minutes = startMin; minutes <= lastStartMin; minutes += 30) {
    slots.push(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`)
  }
  timeSlots.value = slots
  if (!slots.includes(selected.startTime)) selected.startTime = ''
}

function selectDate(dateStr) {
  selected.date = dateStr
  selected.startTime = ''
  buildTimeSlots()
}

function selectDuration(option) {
  selected.bookingType = option.bookingType
  selected.duration = option.hours || 1
  buildTimeSlots()
}

async function submit() {
  errorMsg.value = ''
  if (!form.name || !form.email) {
    alert(state.lang === 'zh' ? '请填写必填个人信息' : 'Please fill in required info')
    return
  }
  if (selected.bookingType !== 'all_day' && !selected.startTime) {
    alert(state.lang === 'zh' ? '请选择到店时间' : 'Please select arrival time')
    return
  }

  submitting.value = true
  try {
    if (!state.store) await loadStore()
    const store = state.store
    const bookingType = selected.bookingType
    const durationHours = bookingType === 'all_day' ? null : selected.duration
    const selectedPackage = bookingType === 'package' ? fourHourPackage.value : null
    if (bookingType === 'package' && !selectedPackage) {
      throw new Error(state.lang === 'zh' ? '4 小时套餐暂不可用，请稍后再试' : 'The 4-hour package is temporarily unavailable.')
    }

    const avail = await fetchAvailability(selected.date)
    const tables = store?.tables || []
    const hours = (store?.businessHours || '10:00-21:00').split('-')
    const startTime = bookingType === 'all_day' ? hours[0] : selected.startTime
    const endTime = bookingType === 'all_day' ? hours[1] : addMinutes(selected.startTime, durationHours * 60)

    const table = tables.find((tb) => {
      if ((tb.capacity || 0) < selected.people) return false
      const ta = Array.isArray(avail) ? avail.find((a) => a.id === tb.id) : null
      const win = ta && ta.bookedWindows ? ta.bookedWindows : []
      return !win.some((w) => w.startTime < endTime && w.endTime > startTime)
    })
    if (!table) {
      throw new Error(state.lang === 'zh' ? '该时段暂无足够空位，请更换时间或人数' : 'No table available for this time and party size.')
    }

    const dto = {
      storeId: 1,
      tableId: table.id,
      date: selected.date,
      peopleCount: selected.people,
      bookingType,
      payMethod: 'wechat',
      guestName: form.name.trim(),
      guestEmail: form.email.trim(),
      note: [form.notes, form.phone ? `电话 ${form.phone}` : ''].filter(Boolean).join(' | ')
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
    success.value = true
  } catch (err) {
    errorMsg.value = err.message || t('error_desc')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  if (!state.store) await loadStore()
  buildDates()
})
</script>

<template>
  <section id="booking" class="booking" :class="{ 'booking-standalone': standalone }">
    <div class="container">
      <h2 class="section-title">
        <span>{{ t('booking_title') }}</span>
        <img src="/photos/booking-title.png" alt="Booking" class="title-icon">
      </h2>
      <div v-if="!success" class="booking-app">
        <div class="booking-header">
          <div class="studio-mini-card">
            <img src="/photos/idol-logo.png" alt="Studio" class="studio-thumb">
            <div class="studio-info">
              <h3>{{ state.store?.name || 'IDOL BEADS' }}</h3>
              <p>{{ t('studio_location') }}</p>
            </div>
          </div>
        </div>

        <div class="booking-body">
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

          <template v-if="selected.bookingType !== 'all_day'">
            <div class="section-label"><span class="icon">⏰</span> <span>{{ t('label_time_select') }}</span></div>
            <div class="grid-selector time-grid">
              <button
                v-for="s in timeSlots"
                :key="s"
                type="button"
                class="grid-btn"
                :class="{ active: selected.startTime === s }"
                @click="selected.startTime = s"
              >{{ s }}</button>
            </div>
          </template>

          <div class="section-label"><span class="icon">⌛</span> <span>{{ t('label_duration_select') }}</span></div>
          <div class="grid-selector duration-grid">
            <button
              v-for="d in durationOptions"
              :key="d.key"
              type="button"
              class="grid-btn"
              :class="{ active: selected.bookingType === d.bookingType }"
              @click="selectDuration(d)"
            >{{ d.label }}</button>
          </div>

          <div class="section-label"><span class="icon">👥</span> <span>{{ t('label_people_select') }}</span></div>
          <div class="grid-selector people-grid">
            <button
              v-for="p in peopleOptions"
              :key="p"
              type="button"
              class="grid-btn"
              :class="{ active: selected.people === p }"
              @click="selected.people = p"
            >{{ p }} <span>{{ t('unit_person') }}</span></button>
          </div>
          <p class="section-note">{{ t('people_note') }}</p>

          <div class="personal-info-form">
            <div class="form-row">
              <input v-model="form.name" type="text" :placeholder="t('placeholder_name')" required>
              <input v-model="form.phone" type="tel" :placeholder="t('placeholder_phone')">
            </div>
            <input v-model="form.email" type="email" :placeholder="t('placeholder_email')" required>
            <textarea v-model="form.notes" rows="2" :placeholder="t('placeholder_notes')"></textarea>
          </div>
        </div>

        <div class="booking-footer">
          <button type="button" class="btn btn-submit" :disabled="submitting" @click="submit">
            {{ submitting ? t('btn_submitting') : t('btn_confirm') }}
          </button>
        </div>
      </div>

      <div v-if="success" class="success-message">
        <h3>{{ t('success_title') }}</h3>
        <p>{{ t('success_desc') }}</p>
        <div v-if="bookingResult?.code" class="booking-code">
          <span>预约码 · Booking Code</span>
          <strong>{{ bookingResult.code }}</strong>
        </div>
        <div class="success-actions">
          <a class="btn btn-primary" href="/account">查看我的预约</a>
          <a class="btn btn-secondary" href="/">返回首页</a>
        </div>
      </div>
      <div v-if="errorMsg" class="error-message">
        <h3>{{ t('error_title') }}</h3>
        <p>{{ errorMsg }}</p>
      </div>
    </div>
  </section>
</template>
