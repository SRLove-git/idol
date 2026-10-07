<script setup>
import { computed, reactive, ref } from 'vue'

const props = defineProps({
  mode: { type: String, required: true }
})

const isLogin = computed(() => props.mode === 'login')
const form = reactive({ account: '', username: '', email: '', emailCode: '', password: '' })
const sending = ref(false)
const submitting = ref(false)
const cooldown = ref(0)
const codeMessage = ref('验证码 10 分钟内有效')
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
    errorMessage.value = '请先填写正确的邮箱地址'
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
    if (!response.ok) throw new Error(errorText(data, '验证码发送失败'))
    cooldown.value = Number(data.retryAfter) || 60
    codeMessage.value = '验证码已发送，请检查收件箱和垃圾邮件'
    const timer = window.setInterval(() => {
      cooldown.value -= 1
      if (cooldown.value <= 0) window.clearInterval(timer)
    }, 1000)
  } catch (error) {
    errorMessage.value = error.message || '验证码发送失败'
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
    if (!response.ok) throw new Error(errorText(data, isLogin.value ? '登录失败' : '注册失败'))
    window.location.href = nextPath()
  } catch (error) {
    errorMessage.value = error.message || (isLogin.value ? '登录失败' : '注册失败')
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
        <h1>把灵感<br>拼成喜欢的样子</h1>
        <p>DIY BEAD WORKSHOP · SINGAPORE</p>
      </div>
    </section>

    <section class="auth-panel">
      <div class="auth-card">
        <a class="auth-back" href="/">← 返回首页</a>
        <div class="auth-heading">
          <span>{{ isLogin ? 'WELCOME BACK' : 'JOIN IDOL BEADS' }}</span>
          <h1>{{ isLogin ? '登录账号' : '创建账号' }}</h1>
          <p>{{ isLogin ? '登录后查看你的预约与会员信息。' : '验证邮箱后即可完成注册。' }}</p>
        </div>

        <form class="auth-form" @submit.prevent="submit">
          <label v-if="isLogin">
            <span>用户名或邮箱</span>
            <input v-model="form.account" autocomplete="username" maxlength="255" placeholder="请输入用户名或邮箱" required>
          </label>

          <template v-else>
            <label>
              <span>用户名</span>
              <input v-model="form.username" autocomplete="username" minlength="2" maxlength="30" pattern="[A-Za-z0-9_]+" placeholder="2–30 位字母、数字或下划线" required>
            </label>
            <label>
              <span>邮箱</span>
              <input v-model="form.email" type="email" autocomplete="email" maxlength="255" placeholder="you@example.com" required>
            </label>
            <label>
              <span>邮箱验证码</span>
              <div class="auth-code-row">
                <input v-model="form.emailCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="6 位验证码" required>
                <button type="button" :disabled="sending || cooldown > 0" @click="sendCode">
                  {{ sending ? '发送中…' : cooldown > 0 ? `${cooldown}s` : '获取验证码' }}
                </button>
              </div>
              <small>{{ codeMessage }}</small>
            </label>
          </template>

          <label>
            <span>密码</span>
            <input v-model="form.password" type="password" :autocomplete="isLogin ? 'current-password' : 'new-password'" minlength="6" maxlength="32" placeholder="至少 6 位" required>
          </label>

          <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
          <button class="auth-submit" type="submit" :disabled="submitting">
            {{ submitting ? '请稍候…' : isLogin ? '登录' : '注册并登录' }}
          </button>
        </form>

        <p class="auth-switch">
          {{ isLogin ? '还没有账号？' : '已经有账号？' }}
          <a :href="isLogin ? '/register' : '/login'">{{ isLogin ? '立即注册' : '去登录' }}</a>
        </p>
        <p class="auth-booking-note">只想预约？<a href="/booking">无需登录，直接预约</a></p>
      </div>
    </section>
  </main>
</template>
