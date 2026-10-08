<script setup>
import { computed } from 'vue'
import { defaultSiteMedia, siteLink, siteMedia, state, t } from '../store.js'

const logo = computed(() => siteMedia('logo', defaultSiteMedia.logo))
const instagram = computed(() => siteLink('instagram', 'https://www.instagram.com/idol_beads'))
const xiaohongshu = computed(() => siteLink('xiaohongshu', 'https://www.xiaohongshu.com/user/profile/650d5c8e00000000120075e5'))
const douyin = computed(() => siteLink('douyin', 'https://v.douyin.com/lQTCIhRoSAY/'))
</script>

<template>
  <footer id="social" class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <section class="footer-column footer-brand" aria-label="Brand">
          <img :src="logo" alt="IDOL Beads Logo" class="footer-logo">
          <h3 class="footer-brand-name">{{ state.store?.name || 'IDOL BEADS' }}</h3>
        </section>
        <section class="footer-column">
          <h3 class="footer-title">{{ t('footer_location_title') }}</h3>
          <address class="footer-address">{{ state.store?.address }}</address>
        </section>
        <section class="footer-column">
          <h3 class="footer-title">{{ t('footer_social_title') }}</h3>
          <div class="footer-links">
            <a v-if="instagram" :href="instagram" target="_blank" rel="noopener noreferrer" class="social-icon">Instagram · IDOL Beads</a>
            <a v-if="xiaohongshu" :href="xiaohongshu" target="_blank" rel="noopener noreferrer" class="social-icon">{{ t('social_xhs') }} · IDOL Beads</a>
            <a v-if="douyin" :href="douyin" target="_blank" rel="noopener noreferrer" class="social-icon">抖音 · IDOL Beads</a>
          </div>
        </section>
        <section class="footer-column">
          <h3 class="footer-title">{{ t('footer_hours_title') }}</h3>
          <div class="footer-hours">
            <p>{{ state.store?.businessHours }}</p>
            <p>{{ t('footer_hours_note') }}</p>
          </div>
        </section>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 {{ state.store?.name || 'IDOL BEADS' }}. All Rights Reserved.</p>
      </div>
    </div>
  </footer>
</template>
