<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getCurrentUser } from '../auth-session.js'
import { defaultSiteMedia, siteMedia, state, t } from '../store.js'

const menuOpen = ref(false)
const loggedIn = ref(false)
const memberActive = ref(false)
const currentPath = ref(window.location.pathname.replace(/\/+$/, '') || '/')
const currentHash = ref(window.location.hash)
const logo = computed(() => siteMedia('logo', defaultSiteMedia.logo))

function syncCurrentLocation() {
  currentPath.value = window.location.pathname.replace(/\/+$/, '') || '/'
  currentHash.value = window.location.hash
}

function isPageActive(path) {
  return currentPath.value === path
}

function isHomeSectionActive(hash) {
  if (currentPath.value !== '/') return false
  if (hash === '#home') return !currentHash.value || currentHash.value === '#home'
  return currentHash.value === hash
}

function closeMenu() {
  menuOpen.value = false
}

function handleMenuKeydown(event) {
  if (event.key === 'Escape') closeMenu()
}

onMounted(async () => {
  window.addEventListener('keydown', handleMenuKeydown)
  window.addEventListener('hashchange', syncCurrentLocation)
  window.addEventListener('popstate', syncCurrentLocation)
  try {
    loggedIn.value = Boolean(await getCurrentUser())
    if (loggedIn.value) {
      const memberResponse = await fetch('/api/members/me')
      if (memberResponse.ok) memberActive.value = (await memberResponse.json()).status === 'active'
    }
  } catch {
    loggedIn.value = false
    memberActive.value = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleMenuKeydown)
  window.removeEventListener('hashchange', syncCurrentLocation)
  window.removeEventListener('popstate', syncCurrentLocation)
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

      <div class="mobile-header-actions" :aria-label="state.lang === 'zh' ? '快捷操作' : 'Quick actions'">
        <a v-if="state.bookingEnabled" href="/booking" :class="{ 'is-active': isPageActive('/booking') }" :aria-current="isPageActive('/booking') ? 'page' : undefined">{{ state.lang === 'zh' ? '预约' : 'Book' }}</a>
        <template v-if="!loggedIn">
          <a href="/login" :class="{ 'is-active': isPageActive('/login') }" :aria-current="isPageActive('/login') ? 'page' : undefined">{{ state.lang === 'zh' ? '登录' : 'Log in' }}</a>
          <a href="/register" :class="{ 'is-active': isPageActive('/register') }" :aria-current="isPageActive('/register') ? 'page' : undefined">{{ state.lang === 'zh' ? '注册' : 'Join' }}</a>
        </template>
      </div>

      <div class="mobile-language-switcher" role="group" :aria-label="t('language_switch_label')">
        <button type="button" :class="{ active: state.lang === 'zh' }" :aria-pressed="state.lang === 'zh'" @click="state.lang = 'zh'">中</button>
        <button type="button" :class="{ active: state.lang === 'en' }" :aria-pressed="state.lang === 'en'" @click="state.lang = 'en'">EN</button>
      </div>

      <button class="mobile-menu-button" type="button" :aria-expanded="menuOpen" :aria-label="menuOpen ? (state.lang === 'zh' ? '关闭导航' : 'Close navigation') : t('mobile_menu_label')" aria-controls="site-navigation" @click="menuOpen = !menuOpen">
        <i></i><i></i><i></i>
      </button>

      <nav id="site-navigation" class="site-nav" :class="{ 'is-open': menuOpen }" @click="closeMenu">
        <a href="/#home" :class="{ 'is-active': isHomeSectionActive('#home') }" :aria-current="isHomeSectionActive('#home') ? 'location' : undefined">{{ t('nav_home') }}</a>
        <a href="/#social" :class="{ 'is-active': isHomeSectionActive('#social') }" :aria-current="isHomeSectionActive('#social') ? 'location' : undefined">{{ t('nav_contact') }}</a>
        <a href="/highlights" :class="{ 'is-active': isPageActive('/highlights') }" :aria-current="isPageActive('/highlights') ? 'page' : undefined">{{ t('nav_highlights') }}</a>
        <a href="/#pricing" :class="{ 'is-active': isHomeSectionActive('#pricing') }" :aria-current="isHomeSectionActive('#pricing') ? 'location' : undefined">{{ t('nav_pricing') }}</a>
        <a v-if="state.bookingEnabled" class="nav-booking nav-external-mobile" href="/booking" :class="{ 'is-active': isPageActive('/booking') }" :aria-current="isPageActive('/booking') ? 'page' : undefined">{{ t('nav_booking') }}</a>
        <a v-if="loggedIn" class="nav-account" :class="{ 'is-member': memberActive, 'is-active': isPageActive('/account') }" href="/account" :aria-current="isPageActive('/account') ? 'page' : undefined">
          {{ memberActive ? `★ ${t('nav_member_center')}` : t('nav_account') }}
        </a>
        <template v-else>
          <a href="/account" :class="{ 'is-active': isPageActive('/account') }" :aria-current="isPageActive('/account') ? 'page' : undefined">{{ t('nav_lookup') }}</a>
          <a class="nav-external-mobile" href="/login" :class="{ 'is-active': isPageActive('/login') }" :aria-current="isPageActive('/login') ? 'page' : undefined">{{ t('nav_login') }}</a>
          <a class="nav-account nav-external-mobile" href="/register" :class="{ 'is-active': isPageActive('/register') }" :aria-current="isPageActive('/register') ? 'page' : undefined">{{ t('nav_register') }}</a>
        </template>
        <div class="language-switcher" role="group" :aria-label="t('language_switch_label')">
          <span class="language-switcher-icon" aria-hidden="true">◎</span>
          <button type="button" :class="{ active: state.lang === 'zh' }" :aria-pressed="state.lang === 'zh'" @click="state.lang = 'zh'">中</button>
          <button type="button" :class="{ active: state.lang === 'en' }" :aria-pressed="state.lang === 'en'" @click="state.lang = 'en'">EN</button>
        </div>
      </nav>
    </div>
  </header>
  <button v-if="menuOpen" class="mobile-menu-backdrop" type="button" :aria-label="state.lang === 'zh' ? '关闭导航' : 'Close navigation'" @click="closeMenu"></button>
</template>
