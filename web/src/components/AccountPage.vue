<script setup>
import { computed, onMounted, ref } from 'vue'
import { state, t } from '../store.js'

const loading = ref(true)
const errorMessage = ref('')
const user = ref(null)
const appointments = ref([])
const membership = ref(null)
const memberPlans = ref([])
const memberOrders = ref([])
const membershipError = ref('')
const purchasingPlanId = ref(null)
const guestEmail = ref('')
const guestPhone = ref('')
const lookupLoading = ref(false)
const lookupError = ref('')
const lookupDone = ref(false)

const initial = computed(() => (user.value?.nickname || user.value?.username || 'I').slice(0, 1).toUpperCase())
const membershipActive = computed(() => membership.value?.status === 'active')
const pendingMemberOrder = computed(() => memberOrders.value.find((item) => item.status === 'pending') || null)
const statusText = (status) => t(`status_${status}`)

function localizedMemberName(value) {
  if (state.lang === 'zh') return value
  return /[\u3400-\u9fff]/.test(value || '') ? t('member_level_default') : value
}

function localizedPlanName(plan) {
  if (state.lang === 'zh') return plan?.name || plan?.planName || ''
  return Number(plan?.durationDays) > 40 ? t('member_plan_annual') : t('member_plan_monthly')
}

function localizedBenefit(value) {
  if (state.lang === 'zh' || !/[\u3400-\u9fff]/.test(value || '')) return value
  return t('member_plan_benefit_discount')
}

function tableNames(item) {
  if (item.tables?.length) return item.tables.map((table) => table.name).join('、')
  return item.tableName || item.storeName
}

function formatMemberDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(state.lang === 'zh' ? 'zh-CN' : 'en-SG', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value))
}

async function loadMembership() {
  membershipError.value = ''
  try {
    const responses = await Promise.all([
      fetch('/api/members/me'),
      fetch('/api/members/plans'),
      fetch('/api/members/orders')
    ])
    if (responses.some((response) => !response.ok)) throw new Error(t('membership_load_failed'))
    const [memberData, plansData, ordersData] = await Promise.all(responses.map((response) => response.json()))
    membership.value = memberData
    memberPlans.value = plansData || []
    memberOrders.value = ordersData || []
  } catch (error) {
    membershipError.value = error.message || t('membership_load_failed')
  }
}

async function purchaseMembership(plan) {
  if (pendingMemberOrder.value) return
  const confirmation = t('membership_confirm_request')
    .replace('{plan}', localizedPlanName(plan))
    .replace('{price}', Number(plan.price).toFixed(2))
  if (!window.confirm(confirmation)) return
  purchasingPlanId.value = plan.id
  membershipError.value = ''
  try {
    const response = await fetch('/api/members/purchase', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ planId: plan.id })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const serverMessage = Array.isArray(data.message) ? data.message[0] : data.message
      throw new Error(state.lang === 'zh' ? (serverMessage || t('membership_request_failed')) : t('membership_request_failed'))
    }
    await loadMembership()
  } catch (error) {
    membershipError.value = error.message || t('membership_request_failed')
  } finally {
    purchasingPlanId.value = null
  }
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

    const [appointmentResponse] = await Promise.all([
      fetch('/api/appointments?page=1&pageSize=50'),
      loadMembership()
    ])
    if (!appointmentResponse.ok) throw new Error(t('appointments_load_failed'))
    const data = await appointmentResponse.json()
    appointments.value = data.items || []
  } catch (error) {
    errorMessage.value = error.message || t('account_load_failed')
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
      throw new Error(state.lang === 'zh' ? (message || t('lookup_failed')) : t('lookup_failed'))
    }
    appointments.value = data.items || []
    lookupDone.value = true
  } catch (error) {
    lookupError.value = error.message || t('lookup_failed')
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
        <h1>{{ t(user ? 'account_title' : 'account_lookup_title') }}</h1>
        <p>{{ t(user ? 'account_desc' : 'account_lookup_desc') }}</p>
      </div>
    </section>

    <section class="container account-content">
      <div v-if="loading" class="account-loading">{{ t('account_loading') }}</div>
      <div v-else-if="errorMessage" class="account-loading is-error">{{ errorMessage }}</div>
      <section v-else-if="!user" class="appointments-card guest-lookup-card">
        <div class="guest-lookup-heading">
          <span>RESERVATION LOOKUP</span>
          <h2>{{ t('account_lookup_heading') }}</h2>
          <p>{{ t('account_lookup_help') }}</p>
        </div>

        <form class="guest-lookup-form" @submit.prevent="lookupAppointment">
          <label>
            <span>{{ t('account_booking_email') }}</span>
            <input v-model="guestEmail" type="email" autocomplete="email" required placeholder="name@example.com">
          </label>
          <label>
            <span>{{ t('account_booking_phone') }}</span>
            <input v-model="guestPhone" type="tel" autocomplete="tel" maxlength="30" required :placeholder="t('account_phone_placeholder')">
          </label>
          <button class="btn btn-primary" type="submit" :disabled="lookupLoading">
            {{ lookupLoading ? t('account_searching') : t('account_lookup_button') }}
          </button>
        </form>

        <p v-if="lookupError" class="guest-lookup-error">{{ lookupError }}</p>

        <div v-if="lookupDone" class="guest-lookup-result">
          <div class="account-section-head">
            <div><span>RESULT</span><h2>{{ t('account_result_title') }}</h2></div>
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
                  <span class="appointment-status" :class="`status-${item.status}`">{{ statusText(item.status) }}</span>
                </div>
                <p>{{ item.startTime }}–{{ item.endTime }} · {{ item.peopleCount }} {{ t('account_people_unit') }} · {{ tableNames(item) }}</p>
                <small>{{ t('account_booking_code') }} {{ item.code }} · S${{ Number(item.amount || 0).toFixed(2) }}<template v-if="item.isMember"> · ★ {{ t('account_member_booking') }}</template></small>
              </div>
            </article>
          </div>
        </div>

        <div v-else class="guest-lookup-help">
          <p>{{ t('account_registered') }} <a href="/login?next=/account">{{ t('account_login_all') }}</a></p>
          <p v-if="state.bookingEnabled">{{ t('account_no_booking_question') }} <a href="/booking">{{ t('account_book_now') }}</a></p>
        </div>

      </section>
      <template v-else>
        <aside class="profile-card">
          <div class="profile-avatar">{{ initial }}</div>
          <h2>{{ user.nickname || user.username }}</h2>
          <p>@{{ user.username }}</p>
          <a :href="`mailto:${user.email}`">{{ user.email }}</a>
          <span class="profile-member-pill" :class="{ 'is-active': membershipActive }">
            {{ membershipActive ? `★ ${localizedMemberName(membership.levelName)}` : t('account_standard_user') }}
          </span>
          <div class="profile-actions">
            <a v-if="state.bookingEnabled" class="btn btn-primary" href="/booking">{{ t('account_book_again') }}</a>
            <button type="button" @click="logout">{{ t('account_logout') }}</button>
          </div>
        </aside>

        <div class="account-main-column">
          <section class="member-center-card" :class="{ 'is-active': membershipActive }">
            <div class="member-center-head">
              <div>
                <span>MEMBERSHIP</span>
                <h2>{{ membershipActive ? localizedMemberName(membership.levelName) : membership?.status === 'expired' ? t('member_expired') : t('member_join_title') }}</h2>
                <p v-if="membershipActive">{{ t('member_number') }} {{ membership.memberNo }} · {{ t('member_valid_until') }} {{ formatMemberDate(membership.expireAt) }}</p>
                <p v-else>{{ t('member_intro') }}</p>
              </div>
              <div class="member-state-mark">{{ membershipActive ? 'ACTIVE' : 'MEMBER' }}</div>
            </div>

            <div v-if="membershipActive" class="active-member-benefits">
              <span>✓ {{ t('member_benefit_price') }}</span>
              <span>✓ {{ t('member_benefit_gift') }}</span>
              <span>✓ {{ t('member_benefit_discount') }}</span>
            </div>

            <div v-if="pendingMemberOrder" class="member-order-pending" role="status">
              <strong>{{ t('member_pending_title') }}</strong>
              <span>{{ localizedPlanName(pendingMemberOrder) }} · S${{ Number(pendingMemberOrder.amount).toFixed(2) }} · {{ t('member_pay_in_store') }}</span>
            </div>

            <div v-if="!pendingMemberOrder" class="member-plan-grid">
              <article v-for="plan in memberPlans" :key="plan.id" class="member-plan-card" :class="{ 'is-recommended': plan.recommended }">
                <span v-if="plan.badge" class="member-plan-badge">{{ plan.badge }}</span>
                <h3>{{ localizedPlanName(plan) }}</h3>
                <strong>S${{ Number(plan.price).toFixed(2) }}</strong>
                <small>{{ plan.durationDays }} {{ t('member_days') }}</small>
                <ul><li v-for="benefit in plan.benefits" :key="benefit">{{ localizedBenefit(benefit) }}</li></ul>
                <button type="button" :disabled="purchasingPlanId !== null" @click="purchaseMembership(plan)">
                  {{ purchasingPlanId === plan.id ? t('member_submitting') : membershipActive ? t('member_renew') : t('member_apply') }}
                </button>
              </article>
            </div>
            <p v-if="membershipError" class="member-center-error" role="alert">{{ membershipError }}</p>
          </section>

          <section class="appointments-card">
          <div class="account-section-head">
            <div>
              <span>RESERVATIONS</span>
              <h2>{{ t('reservations_title') }}</h2>
            </div>
            <strong>{{ appointments.length }}</strong>
          </div>

          <div v-if="!appointments.length" class="empty-appointments">
            <span>✦</span>
            <h3>{{ t('reservations_empty_title') }}</h3>
            <p>{{ t(state.bookingEnabled ? 'reservations_empty_desc' : 'reservations_closed_desc') }}</p>
            <a v-if="state.bookingEnabled" class="btn btn-primary" href="/booking">{{ t('reservations_book_now') }}</a>
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
                  <span class="appointment-status" :class="`status-${item.status}`">{{ statusText(item.status) }}</span>
                </div>
                <p>{{ item.startTime }}–{{ item.endTime }} · {{ item.peopleCount }} {{ t('account_people_unit') }} · {{ tableNames(item) }}</p>
                <small>{{ t('account_booking_code') }} {{ item.code }} · S${{ Number(item.amount || 0).toFixed(2) }}<template v-if="item.isMember"> · ★ {{ t('account_member_booking') }}</template></small>
              </div>
            </article>
          </div>
          </section>
        </div>
      </template>
    </section>
  </main>
</template>
