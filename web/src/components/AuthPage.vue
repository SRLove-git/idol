<script setup>
import { computed, reactive, ref } from 'vue'
import { state, t } from '../store.js'

const props = defineProps({
  mode: { type: String, required: true }
})

const isLogin = computed(() => props.mode === 'login')
const form = reactive({ account: '', username: '', email: '', emailCode: '', password: '' })
const sending = ref(false)
const submitting = ref(false)
const cooldown = ref(0)
const codeMessageKey = ref('auth_code_valid')
const errorMessage = ref('')

function errorText(data, fallback) {
  if (Array.isArray(data?.message)) return data.message[0] || fallback
  return data?.message || fallback
}

function nextPath() {
  const value = new URLSearchParams(window.location.search).get('next')
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/account'
}

async function sendCode() {
  errorMessage.value = ''
  if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) {
    errorMessage.value = t('auth_invalid_email')
    return
  }
  sending.value = true
  try {
    const response = await fetch('/api/auth/register-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email.trim() })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(state.lang === 'zh' ? errorText(data, t('auth_code_failed')) : t('auth_code_failed'))
    cooldown.value = Number(data.retryAfter) || 60
    codeMessageKey.value = 'auth_code_sent'
    const timer = window.setInterval(() => {
      cooldown.value -= 1
      if (cooldown.value <= 0) window.clearInterval(timer)
    }, 1000)
  } catch (error) {
    errorMessage.value = error.message || t('auth_code_failed')
  } finally {
    sending.value = false
  }
}

async function submit() {
  errorMessage.value = ''
  submitting.value = true
  try {
    const endpoint = isLogin.value ? '/auth/login' : '/auth/register'
    const payload = isLogin.value
      ? { account: form.account.trim(), password: form.password }
      : {
          username: form.username.trim(),
          email: form.email.trim(),
          emailCode: form.emailCode.trim(),
          password: form.password
        }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const fallback = t(isLogin.value ? 'auth_login_failed' : 'auth_register_failed')
      throw new Error(state.lang === 'zh' ? errorText(data, fallback) : fallback)
    }
    window.location.href = nextPath()
  } catch (error) {
    errorMessage.value = error.message || t(isLogin.value ? 'auth_login_failed' : 'auth_register_failed')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-visual" aria-hidden="true">
      <div class="auth-visual-content">
        <img src="/photos/idol-logo.png" alt="">
        <span>IDOL BEADS</span>
        <h1>{{ t('auth_visual_title') }}</h1>
        <p>DIY BEAD WORKSHOP · SINGAPORE</p>
      </div>
    </section>

    <section class="auth-panel">
      <div class="auth-card">
        <a class="auth-back" href="/">← {{ t('auth_back_home') }}</a>
        <div class="auth-heading">
          <span>{{ isLogin ? 'WELCOME BACK' : 'JOIN IDOL BEADS' }}</span>
          <h1>{{ t(isLogin ? 'auth_login_title' : 'auth_register_title') }}</h1>
          <p>{{ t(isLogin ? 'auth_login_desc' : 'auth_register_desc') }}</p>
        </div>

        <form class="auth-form" @submit.prevent="submit">
          <label v-if="isLogin">
            <span>{{ t('auth_account_label') }}</span>
            <input v-model="form.account" autocomplete="username" maxlength="255" :placeholder="t('auth_account_placeholder')" required>
          </label>

          <template v-else>
            <label>
              <span>{{ t('auth_username_label') }}</span>
              <input v-model="form.username" autocomplete="username" minlength="2" maxlength="30" pattern="[A-Za-z0-9_]+" :placeholder="t('auth_username_placeholder')" required>
            </label>
            <label>
              <span>{{ t('auth_email_label') }}</span>
              <input v-model="form.email" type="email" autocomplete="email" maxlength="255" placeholder="you@example.com" required>
            </label>
            <label>
              <span>{{ t('auth_code_label') }}</span>
              <div class="auth-code-row">
                <input v-model="form.emailCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" :placeholder="t('auth_code_placeholder')" required>
                <button type="button" :disabled="sending || cooldown > 0" @click="sendCode">
                  {{ sending ? t('auth_sending') : cooldown > 0 ? `${cooldown}s` : t('auth_get_code') }}
                </button>
              </div>
              <small>{{ t(codeMessageKey) }}</small>
            </label>
          </template>

          <label>
            <span>{{ t('auth_password_label') }}</span>
            <input v-model="form.password" type="password" :autocomplete="isLogin ? 'current-password' : 'new-password'" minlength="6" maxlength="32" :placeholder="t('auth_password_placeholder')" required>
          </label>

          <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
          <button class="auth-submit" type="submit" :disabled="submitting">
            {{ submitting ? t('auth_wait') : t(isLogin ? 'auth_login_button' : 'auth_register_button') }}
          </button>
        </form>

        <p class="auth-switch">
          {{ t(isLogin ? 'auth_no_account' : 'auth_has_account') }}
          <a :href="isLogin ? '/register' : '/login'">{{ t(isLogin ? 'auth_register_now' : 'auth_go_login') }}</a>
        </p>
        <p v-if="state.bookingEnabled" class="auth-booking-note">{{ t('auth_booking_question') }} <a href="/booking">{{ t('auth_booking_direct') }}</a></p>
      </div>
    </section>
  </main>
</template>
