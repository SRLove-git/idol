<script setup>
import { state, t } from '../store.js'
</script>

<template>
  <footer id="social" class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <section class="footer-column footer-brand" aria-label="Brand">
          <img src="/photos/logo.png" alt="Logo" class="footer-logo">
          <h3 class="footer-brand-name">{{ state.store?.name || 'IDOL BEADS' }}</h3>
        </section>
        <section class="footer-column">
          <h3 class="footer-title">{{ t('footer_location_title') }}</h3>
          <address class="footer-address">{{ state.store?.address }}</address>
        </section>
        <section class="footer-column">
          <h3 class="footer-title">{{ t('footer_social_title') }}</h3>
          <div class="footer-links">
            <a href="https://www.instagram.com/oc.beadsland/" target="_blank" rel="noopener noreferrer" class="social-icon">Instagram</a>
            <a href="https://xhslink.com/m/30sBJLCk9o3" target="_blank" rel="noopener noreferrer" class="social-icon">{{ t('social_xhs') }}</a>
            <a href="javascript:void(0)" class="social-icon" @click="state.wechat = true">{{ t('social_wechat') }}</a>
            <a href="https://www.youtube.com/channel/UCcvcJGn2DflI9YW__K87wWA" target="_blank" rel="noopener noreferrer" class="social-icon">YouTube</a>
            <a href="https://www.tiktok.com/@oc.beadsland" target="_blank" rel="noopener noreferrer" class="social-icon">TikTok</a>
          </div>
        </section>
        <section class="footer-column">
          <h3 class="footer-title">{{ t('footer_hours_title') }}</h3>
          <div class="footer-hours">
            <p>{{ state.store?.businessHours }}</p>
            <p>每天 · Daily</p>
          </div>
        </section>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 {{ state.store?.name || 'IDOL BEADS' }}. All Rights Reserved.</p>
      </div>
    </div>
  </footer>
</template>
