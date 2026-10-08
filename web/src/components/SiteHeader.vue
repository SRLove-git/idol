<script setup>
import { computed, onMounted, ref } from 'vue'
import { defaultSiteMedia, siteMedia, state, t } from '../store.js'

const menuOpen = ref(false)
const loggedIn = ref(false)
const memberActive = ref(false)
const logo = computed(() => siteMedia('logo', defaultSiteMedia.logo))

onMounted(async () => {
  try {
    const meResponse = await fetch('/api/auth/me')
    loggedIn.value = meResponse.ok
    if (loggedIn.value) {
      const memberResponse = await fetch('/api/members/me')
      if (memberResponse.ok) memberActive.value = (await memberResponse.json()).status === 'active'
    }
  } catch {
    loggedIn.value = false
    memberActive.value = false
  }
})
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/" :aria-label="t('brand_home_label')">
        <img :src="logo" alt="IDOL Beads" class="header-logo">
        <span>
          <strong>{{ state.store?.name || 'IDOL BEADS' }}</strong>
          <small>DIY BEAD WORKSHOP</small>
        </span>
      </a>

      <button class="mobile-menu-button" type="button" :aria-expanded="menuOpen" :aria-label="t('mobile_menu_label')" @click="menuOpen = !menuOpen">
        <i></i><i></i><i></i>
      </button>

      <nav class="site-nav" :class="{ 'is-open': menuOpen }" @click="menuOpen = false">
        <a href="/#home">{{ t('nav_home') }}</a>
        <a href="/highlights">{{ t('nav_highlights') }}</a>
        <a href="/#pricing">{{ t('nav_pricing') }}</a>
        <a v-if="state.bookingEnabled" href="/booking">{{ t('nav_booking') }}</a>
        <a v-if="loggedIn" class="nav-account" :class="{ 'is-member': memberActive }" href="/account">
          {{ memberActive ? `★ ${t('nav_member_center')}` : t('nav_account') }}
        </a>
        <template v-else>
          <a href="/account">{{ t('nav_lookup') }}</a>
          <a href="/login">{{ t('nav_login') }}</a>
          <a class="nav-account" href="/register">{{ t('nav_register') }}</a>
        </template>
        <div class="language-switcher" role="group" :aria-label="t('language_switch_label')">
          <span class="language-switcher-icon" aria-hidden="true">◎</span>
          <button type="button" :class="{ active: state.lang === 'zh' }" :aria-pressed="state.lang === 'zh'" @click="state.lang = 'zh'">中</button>
          <button type="button" :class="{ active: state.lang === 'en' }" :aria-pressed="state.lang === 'en'" @click="state.lang = 'en'">EN</button>
        </div>
      </nav>
    </div>
  </header>
</template>
