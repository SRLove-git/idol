<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { defaultSiteMedia, siteMedia, state, t, addMinutes, loadStore, fetchAvailability, createAppointment } from '../store.js'

defineProps({
  standalone: { type: Boolean, default: false }
})

const dates = ref([])
const timeSlots = ref([])
const availability = ref([])
const availabilityLoading = ref(false)
const availabilityError = ref('')
const selectedTableIds = ref([])
const selected = reactive({ date: '', startTime: '', duration: 1, people: 1, bookingType: 'hourly' })
const form = reactive({ name: '', phone: '', email: '', notes: '' })
const submitting = ref(false)
const success = ref(false)
const bookingResult = ref(null)
const errorMsg = ref('')
let availabilityRequestId = 0
const logo = computed(() => siteMedia('logo', defaultSiteMedia.logo))

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

const tableOptions = computed(() => {
  const window = bookingWindow.value
  return storeTables.value.map((table) => {
    const snapshot = availability.value.find((item) => Number(item.id) === Number(table.id))
    const occupied = !!window && (snapshot?.bookedWindows || []).some(
      (item) => item.startTime < window.endTime && item.endTime > window.startTime
    )
    return {
      ...table,
      occupied,
      selected: selectedTableIds.value.includes(table.id)
    }
  })
})

const selectedTables = computed(() =>
  storeTables.value.filter((table) => selectedTableIds.value.includes(table.id))
)
const selectedCapacity = computed(() =>
  selectedTables.value.reduce((total, table) => total + Number(table.capacity || 0), 0)
)
const tableSelectionReady = computed(() =>
  selectedTableIds.value.length > 0 && selectedCapacity.value >= selected.people
)
const tableSelectionSummary = computed(() => {
  if (!selectedTables.value.length) return ''
  const names = selectedTables.value.map((table) => table.name).join('、')
  if (state.lang === 'zh') {
    return `已选 ${names} · 共 ${selectedCapacity.value} 个座位${tableSelectionReady.value ? '，容量充足' : `，还差 ${selected.people - selectedCapacity.value} 个座位`}`
  }
  return `Selected ${names} · ${selectedCapacity.value} seats${tableSelectionReady.value ? ' · enough capacity' : ` · ${selected.people - selectedCapacity.value} more needed`}`
})

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

function resetTableSelection() {
  selectedTableIds.value = []
}

async function refreshAvailability() {
  const requestId = ++availabilityRequestId
  resetTableSelection()
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
    if (requestId === availabilityRequestId) availabilityLoading.value = false
  }
}

function selectDate(dateStr) {
  selected.date = dateStr
  selected.startTime = ''
  buildTimeSlots()
  void refreshAvailability()
}

function selectTime(time) {
  selected.startTime = time
  resetTableSelection()
}

function selectDuration(option) {
  selected.bookingType = option.bookingType
  selected.duration = option.hours || 1
  buildTimeSlots()
  resetTableSelection()
}

function selectPeople(people) {
  selected.people = people
  resetTableSelection()
}

function toggleTable(table) {
  if (!bookingWindow.value || table.occupied || availabilityLoading.value || availabilityError.value) return
  if (selectedTableIds.value.includes(table.id)) {
    selectedTableIds.value = selectedTableIds.value.filter((id) => id !== table.id)
  } else {
    selectedTableIds.value = [...selectedTableIds.value, table.id]
  }
}

async function submit() {
  errorMsg.value = ''
  if (!form.name || !form.phone || !form.email) {
    alert(state.lang === 'zh' ? '请填写必填个人信息' : 'Please fill in required info')
    return
  }
  if (selected.bookingType !== 'all_day' && !selected.startTime) {
    alert(state.lang === 'zh' ? '请选择到店时间' : 'Please select arrival time')
    return
  }
  if (!tableSelectionReady.value) {
    alert(state.lang === 'zh' ? '请选择足够容纳当前人数的桌位' : 'Please select enough seats for your party')
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
    availability.value = Array.isArray(avail) ? avail : (avail.items || [])
    const hours = (store?.businessHours || '10:00-21:00').split('-')
    const startTime = bookingType === 'all_day' ? hours[0] : selected.startTime
    const endTime = bookingType === 'all_day' ? hours[1] : addMinutes(selected.startTime, durationHours * 60)

    const chosenTables = storeTables.value.filter((table) => selectedTableIds.value.includes(table.id))
    const latestItems = Array.isArray(avail) ? avail : (avail.items || [])
    const hasConflict = chosenTables.some((table) => {
      const tableAvailability = latestItems.find((item) => Number(item.id) === Number(table.id))
      return (tableAvailability?.bookedWindows || []).some(
        (item) => item.startTime < endTime && item.endTime > startTime
      )
    })
    if (hasConflict) {
      resetTableSelection()
      throw new Error(state.lang === 'zh' ? '所选桌位刚刚被预约，请重新选择' : 'A selected seat was just booked. Please choose again.')
    }

    const dto = {
      storeId: 1,
      tableId: selectedTableIds.value[0],
      tableIds: [...selectedTableIds.value],
      date: selected.date,
      peopleCount: selected.people,
      bookingType,
      payMethod: 'wechat',
      guestName: form.name.trim(),
      guestEmail: form.email.trim(),
      note: [form.notes, `电话 ${form.phone.trim()}`].filter(Boolean).join(' | ')
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

          <template v-if="selected.bookingType !== 'all_day'">
            <div class="section-label"><span class="icon">⏰</span> <span>{{ t('label_time_select') }}</span></div>
            <div class="grid-selector time-grid">
              <button
                v-for="s in timeSlots"
                :key="s"
                type="button"
                class="grid-btn"
                :class="{ active: selected.startTime === s }"
                @click="selectTime(s)"
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
              @click="selectPeople(p)"
            >{{ p }} <span>{{ t('unit_person') }}</span></button>
          </div>
          <p class="section-note">{{ t('people_note') }}</p>

          <div class="section-label table-select-label"><span class="icon">▦</span> <span>{{ t('label_table_select') }}</span></div>
          <p class="section-note table-select-hint">{{ t('table_select_hint') }}</p>
          <div class="seat-legend" aria-hidden="true">
            <span><i class="is-available"></i>{{ t('table_available') }}</span>
            <span><i class="is-selected"></i>{{ t('table_selected') }}</span>
            <span><i class="is-occupied"></i>{{ t('table_occupied') }}</span>
          </div>
          <div v-if="!bookingWindow" class="seat-picker-message">{{ t('table_select_time_first') }}</div>
          <div v-else-if="availabilityLoading" class="seat-picker-message">{{ t('table_loading') }}</div>
          <div v-else-if="availabilityError" class="seat-picker-message is-error">{{ availabilityError }}</div>
          <div v-else-if="!tableOptions.length" class="seat-picker-message">{{ t('table_empty') }}</div>
          <div v-else class="seat-grid" role="group" :aria-label="t('label_table_select')">
            <button
              v-for="table in tableOptions"
              :key="table.id"
              type="button"
              class="seat-tile"
              :class="{ 'is-selected': table.selected, 'is-occupied': table.occupied }"
              :disabled="table.occupied"
              :aria-pressed="table.selected"
              @click="toggleTable(table)"
            >
              <span class="seat-tile-status">{{ table.occupied ? t('table_occupied') : table.selected ? t('table_selected') : t('table_available') }}</span>
              <strong>{{ table.name }}</strong>
              <small>{{ table.capacity }} {{ t('unit_person') }}</small>
            </button>
          </div>
          <p
            v-if="tableSelectionSummary"
            class="seat-selection-summary"
            :class="{ 'is-ready': tableSelectionReady }"
          >{{ tableSelectionSummary }}</p>
        </div>

        <div class="booking-body booking-details">
          <div class="section-label personal-info-label"><span class="icon">👤</span> <span>{{ t('label_personal_info') }}</span></div>
          <div class="personal-info-form">
            <div class="form-row">
              <input v-model="form.name" type="text" :placeholder="t('placeholder_name')" required>
              <input v-model="form.phone" type="tel" autocomplete="tel" maxlength="30" :placeholder="t('placeholder_phone')" required>
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

      <div v-if="state.bookingEnabled && success" class="success-message">
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
      <div v-if="state.bookingEnabled && errorMsg" class="error-message">
        <h3>{{ t('error_title') }}</h3>
        <p>{{ errorMsg }}</p>
      </div>
    </div>
  </section>
</template>
