<script setup>
import { state, t } from '../store.js'
</script>

<template>
  <footer id="social" class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <section class="footer-column footer-brand" aria-label="Brand">
          <img src="/photos/idol-logo.png" alt="IDOL Beads Logo" class="footer-logo">
          <h3 class="footer-brand-name">{{ state.store?.name || 'IDOL BEADS' }}</h3>
        </section>
        <section class="footer-column">
          <h3 class="footer-title">{{ t('footer_location_title') }}</h3>
          <address class="footer-address">{{ state.store?.address }}</address>
        </section>
        <section class="footer-column">
          <h3 class="footer-title">{{ t('footer_social_title') }}</h3>
          <div class="footer-links">
            <a href="https://www.instagram.com/idol_beads" target="_blank" rel="noopener noreferrer" class="social-icon">Instagram · IDOL Beads</a>
            <a href="https://xhslink.cn/o/8UeTLFReezj" target="_blank" rel="noopener noreferrer" class="social-icon">{{ t('social_xhs') }} · IDOL Beads</a>
            <a href="https://v.douyin.com/lQTCIhRoSAY/" target="_blank" rel="noopener noreferrer" class="social-icon">抖音 · IDOL Beads</a>
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
