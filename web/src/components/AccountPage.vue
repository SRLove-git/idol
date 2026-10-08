<script setup>
import { computed, onMounted, ref } from 'vue'
import { state } from '../store.js'

const loading = ref(true)
const errorMessage = ref('')
const user = ref(null)
const appointments = ref([])
const guestEmail = ref('')
const guestPhone = ref('')
const lookupLoading = ref(false)
const lookupError = ref('')
const lookupDone = ref(false)

const initial = computed(() => (user.value?.nickname || user.value?.username || 'I').slice(0, 1).toUpperCase())
const statusText = {
  pending: '待确认',
  booked: '已预约',
  checked_in: '已核销',
  in_service: '体验中',
  completed: '已完成',
  cancelled: '已取消'
}

function tableNames(item) {
  if (item.tables?.length) return item.tables.map((table) => table.name).join('、')
  return item.tableName || item.storeName
}

async function loadAccount() {
  try {
    const meResponse = await fetch('/api/auth/me')
    // 未登录、登录态过期或认证接口被限流时都进入游客查询模式，
    // 避免把认证响应直接显示成“账号信息加载失败”。
    if (!meResponse.ok) {
      return
    }
    user.value = await meResponse.json()

    const appointmentResponse = await fetch('/api/appointments?page=1&pageSize=50')
    if (!appointmentResponse.ok) throw new Error('预约记录加载失败')
    const data = await appointmentResponse.json()
    appointments.value = data.items || []
  } catch (error) {
    errorMessage.value = error.message || '页面加载失败'
  } finally {
    loading.value = false
  }
}

async function lookupAppointment() {
  lookupLoading.value = true
  lookupError.value = ''
  lookupDone.value = false
  appointments.value = []
  try {
    const response = await fetch('/api/appointments/lookup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: guestEmail.value.trim(),
        phone: guestPhone.value.trim()
      })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = Array.isArray(data.message) ? data.message.join('；') : data.message
      throw new Error(message || '预约查询失败，请稍后再试')
    }
    appointments.value = data.items || []
    lookupDone.value = true
  } catch (error) {
    lookupError.value = error.message || '预约查询失败，请稍后再试'
  } finally {
    lookupLoading.value = false
  }
}

async function logout() {
  await fetch('/auth/logout', { method: 'POST' })
  window.location.href = '/'
}

onMounted(loadAccount)
</script>

<template>
  <main class="account-page page-main">
    <section class="page-hero account-hero">
      <div class="container">
        <span class="page-kicker">MY IDOL BEADS</span>
        <h1>{{ user ? '我的账号' : '查询预约' }}</h1>
        <p>{{ user ? '在这里查看账号资料和全部预约记录。' : '无需登录，使用预约手机号和邮箱即可查看预约详情。' }}</p>
      </div>
    </section>

    <section class="container account-content">
      <div v-if="loading" class="account-loading">正在加载…</div>
      <div v-else-if="errorMessage" class="account-loading is-error">{{ errorMessage }}</div>
      <section v-else-if="!user" class="appointments-card guest-lookup-card">
        <div class="guest-lookup-heading">
          <span>RESERVATION LOOKUP</span>
          <h2>查找我的预约</h2>
          <p>请输入提交预约时填写的手机号和邮箱，两项信息匹配后即可查看预约。</p>
        </div>

        <form class="guest-lookup-form" @submit.prevent="lookupAppointment">
          <label>
            <span>预约邮箱</span>
            <input v-model="guestEmail" type="email" autocomplete="email" required placeholder="name@example.com">
          </label>
          <label>
            <span>预约手机号</span>
            <input v-model="guestPhone" type="tel" autocomplete="tel" maxlength="30" required placeholder="例如 +65 8123 4567">
          </label>
          <button class="btn btn-primary" type="submit" :disabled="lookupLoading">
            {{ lookupLoading ? '正在查询…' : '查询预约' }}
          </button>
        </form>

        <p v-if="lookupError" class="guest-lookup-error">{{ lookupError }}</p>

        <div v-if="lookupDone" class="guest-lookup-result">
          <div class="account-section-head">
            <div><span>RESULT</span><h2>预约详情</h2></div>
            <strong>{{ appointments.length }}</strong>
          </div>
          <div class="appointment-list">
            <article v-for="item in appointments" :key="item.code" class="appointment-item">
              <div class="appointment-date">
                <strong>{{ item.date?.slice(8, 10) }}</strong>
                <span>{{ item.date?.slice(0, 7) }}</span>
              </div>
              <div class="appointment-main">
                <div>
                  <h3>{{ item.storeName }}</h3>
                  <span class="appointment-status" :class="`status-${item.status}`">{{ statusText[item.status] || item.status }}</span>
                </div>
                <p>{{ item.startTime }}–{{ item.endTime }} · {{ item.peopleCount }} 人 · {{ tableNames(item) }}</p>
                <small>预约码 {{ item.code }} · S${{ Number(item.amount || 0).toFixed(2) }}</small>
              </div>
            </article>
          </div>
        </div>

        <div v-else class="guest-lookup-help">
          <p>已经注册账号？<a href="/login?next=/account">登录后查看全部预约</a></p>
          <p v-if="state.bookingEnabled">还没有预约？<a href="/booking">立即预约体验</a></p>
        </div>

      </section>
      <template v-else>
        <aside class="profile-card">
          <div class="profile-avatar">{{ initial }}</div>
          <h2>{{ user.nickname || user.username }}</h2>
          <p>@{{ user.username }}</p>
          <a :href="`mailto:${user.email}`">{{ user.email }}</a>
          <div class="profile-actions">
            <a v-if="state.bookingEnabled" class="btn btn-primary" href="/booking">再次预约</a>
            <button type="button" @click="logout">退出登录</button>
          </div>
        </aside>

        <section class="appointments-card">
          <div class="account-section-head">
            <div>
              <span>RESERVATIONS</span>
              <h2>我的预约</h2>
            </div>
            <strong>{{ appointments.length }}</strong>
          </div>

          <div v-if="!appointments.length" class="empty-appointments">
            <span>✦</span>
            <h3>还没有预约</h3>
            <p>{{ state.bookingEnabled ? '选一个喜欢的时间，来工作室慢慢拼一件作品吧。' : '线上预约暂未开放，开放后即可在这里预约体验。' }}</p>
            <a v-if="state.bookingEnabled" class="btn btn-primary" href="/booking">现在预约</a>
          </div>

          <div v-else class="appointment-list">
            <article v-for="item in appointments" :key="item.id" class="appointment-item">
              <div class="appointment-date">
                <strong>{{ item.date?.slice(8, 10) }}</strong>
                <span>{{ item.date?.slice(0, 7) }}</span>
              </div>
              <div class="appointment-main">
                <div>
                  <h3>{{ item.storeName }}</h3>
                  <span class="appointment-status" :class="`status-${item.status}`">{{ statusText[item.status] || item.status }}</span>
                </div>
                <p>{{ item.startTime }}–{{ item.endTime }} · {{ item.peopleCount }} 人 · {{ tableNames(item) }}</p>
                <small>预约码 {{ item.code }} · S${{ Number(item.amount || 0).toFixed(2) }}</small>
              </div>
            </article>
          </div>
        </section>
      </template>
    </section>
  </main>
</template>
