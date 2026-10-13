<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { defaultSiteMedia, siteMedia, state, t } from '../store.js'

const backgrounds = computed(() => {
  const configured = siteMedia('heroBackgrounds')
  const images = Array.isArray(configured) ? configured.filter((src) => typeof src === 'string' && src.trim()) : []
  if (images.length) return images
  const legacy = siteMedia('heroBackground')
  // Preserve custom backgrounds while replacing the previous bundled default.
  return typeof legacy === 'string' && !['', '/photos/hero-studio.jpg', '/photos/indoor_1.webp', '/photos/hero-collage.jpg'].includes(legacy)
    ? [legacy]
    : defaultSiteMedia.heroBackgrounds
})
const current = ref(0)
const paused = ref(false)
let timer = null
let motionPreference

function stop() {
  clearInterval(timer)
  timer = null
}

function restart() {
  stop()
  if (paused.value || document.hidden || backgrounds.value.length < 2) return
  timer = setInterval(() => {
    current.value = (current.value + 1) % backgrounds.value.length
  }, 6000)
}

function go(index) {
  current.value = index
  paused.value = true
}

function syncMotionPreference() {
  paused.value = motionPreference.matches
  restart()
}

watch(paused, restart)
watch(backgrounds, () => {
  current.value = 0
  restart()
})

onMounted(() => {
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  syncMotionPreference()
  motionPreference.addEventListener('change', syncMotionPreference)
  document.addEventListener('visibilitychange', restart)
})

onBeforeUnmount(() => {
  stop()
  motionPreference?.removeEventListener('change', syncMotionPreference)
  document.removeEventListener('visibilitychange', restart)
})
</script>

<template>
  <section id="home" class="hero">
    <div class="hero-backgrounds" aria-hidden="true">
      <img
        v-for="(src, index) in backgrounds"
        :key="src"
        :src="src"
        alt=""
        class="hero-background"
        :class="{ active: index === current }"
        :fetchpriority="index === 0 ? 'high' : 'auto'"
        decoding="async"
      >
    </div>
    <div class="container hero-container">
      <h1 class="hero-title">
        <img src="/photos/hero-left.png" alt="Bead" class="hero-deco-img">
        <span>{{ state.store?.name || 'IDOL BEADS' }}</span>
        <img src="/photos/hero-right.png" alt="Bead" class="hero-deco-img">
      </h1>
      <p class="hero-desc-line">
        <img src="/photos/desc-left.png" alt="Bead" class="desc-deco-img">
        <span>{{ t('hero_desc') }}</span>
      </p>
      <div class="hero-slogan-line">
        <img src="/photos/slogan-left.png" alt="Bead" class="slogan-deco-img">
        <span>{{ t('hero_slogan') }}</span>
      </div>
      <div class="cta-buttons">
        <a v-if="state.bookingEnabled" href="/booking" class="btn btn-primary">
          <span>{{ t('cta_booking') }}</span>
          <img src="/photos/btn-booking.png" alt="icon" class="btn-icon">
        </a>
        <a href="#pricing" class="btn btn-secondary">
          <span>{{ t('cta_pricing') }}</span>
          <img src="/photos/btn-pricing.png" alt="icon" class="btn-icon">
        </a>
      </div>
      <div class="hero-icons">
        <img src="/photos/sparkle-1.png" alt="sparkle">
        <img src="/photos/sparkle-2.png" alt="sparkle">
        <img src="/photos/sparkle-3.png" alt="sparkle" style="height: 45px;">
        <img src="/photos/sparkle-4.png" alt="sparkle">
        <img src="/photos/sparkle-5.png" alt="sparkle">
      </div>
    </div>
    <div v-if="backgrounds.length > 1" class="hero-navigation" :aria-label="t('promo_navigation')">
      <button
        v-for="(src, index) in backgrounds"
        :key="src"
        type="button"
        class="hero-dot"
        :class="{ active: index === current }"
        :aria-current="index === current"
        :aria-label="t('promo_show_slide').replace('{count}', String(index + 1))"
        @click="go(index)"
      ></button>
      <button type="button" class="hero-playback" :aria-label="t(paused ? 'hero_play' : 'hero_pause')" @click="paused = !paused">
        <span aria-hidden="true">{{ paused ? '▶' : 'Ⅱ' }}</span>
      </button>
    </div>
  </section>
</template>
