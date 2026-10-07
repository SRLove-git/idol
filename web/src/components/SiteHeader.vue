<script setup>
import { onMounted, ref } from 'vue'
import { state, t } from '../store.js'

const menuOpen = ref(false)
const loggedIn = ref(false)

onMounted(async () => {
  try {
    loggedIn.value = (await fetch('/api/auth/me')).ok
  } catch {
    loggedIn.value = false
  }
})
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/" aria-label="IDOL BEADS 首页">
        <img src="/photos/idol-logo.png" alt="IDOL Beads" class="header-logo">
        <span>
          <strong>{{ state.store?.name || 'IDOL BEADS' }}</strong>
          <small>DIY BEAD WORKSHOP</small>
        </span>
      </a>

      <button class="mobile-menu-button" type="button" :aria-expanded="menuOpen" aria-label="打开导航" @click="menuOpen = !menuOpen">
        <i></i><i></i><i></i>
      </button>

      <nav class="site-nav" :class="{ 'is-open': menuOpen }" @click="menuOpen = false">
        <a href="/#home">{{ t('nav_home') }}</a>
        <a href="/#pricing">{{ t('nav_pricing') }}</a>
        <a href="/booking">{{ t('nav_booking') }}</a>
        <a href="/#social">{{ t('nav_social') }}</a>
        <a v-if="loggedIn" class="nav-account" href="/account">我的预约</a>
        <template v-else>
          <a href="/login">登录</a>
          <a class="nav-account" href="/register">注册</a>
        </template>
        <select v-model="state.lang" aria-label="切换语言">
          <option value="zh">中文</option>
          <option value="en">EN</option>
        </select>
      </nav>
    </div>
  </header>
</template>
