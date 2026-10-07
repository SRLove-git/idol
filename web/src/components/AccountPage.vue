<script setup>
import { computed, onMounted, ref } from 'vue'

const loading = ref(true)
const errorMessage = ref('')
const user = ref(null)
const appointments = ref([])

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
    if (meResponse.status === 401) {
      window.location.href = '/login?next=/account'
      return
    }
    if (!meResponse.ok) throw new Error('账号信息加载失败')
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
        <h1>我的账号</h1>
        <p>在这里查看账号资料和全部预约记录。</p>
      </div>
    </section>

    <section class="container account-content">
      <div v-if="loading" class="account-loading">正在加载…</div>
      <div v-else-if="errorMessage" class="account-loading is-error">{{ errorMessage }}</div>
      <template v-else>
        <aside class="profile-card">
          <div class="profile-avatar">{{ initial }}</div>
          <h2>{{ user.nickname || user.username }}</h2>
          <p>@{{ user.username }}</p>
          <a :href="`mailto:${user.email}`">{{ user.email }}</a>
          <div class="profile-actions">
            <a class="btn btn-primary" href="/booking">再次预约</a>
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
            <p>选一个喜欢的时间，来工作室慢慢拼一件作品吧。</p>
            <a class="btn btn-primary" href="/booking">现在预约</a>
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
