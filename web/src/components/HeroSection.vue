<script setup>
import { computed } from 'vue'
import { defaultSiteMedia, siteMedia, state, t } from '../store.js'

const heroStyle = computed(() => ({ '--hero-background': `url("${siteMedia('heroBackground', defaultSiteMedia.heroBackground)}")` }))
</script>

<template>
  <section id="home" class="hero" :style="heroStyle">
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
  </section>
</template>
