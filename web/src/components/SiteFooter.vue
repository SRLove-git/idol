<script setup>
import { computed } from 'vue'
import { defaultSiteMedia, siteLink, siteMedia, state, t } from '../store.js'

const logo = computed(() => siteMedia('logo', defaultSiteMedia.logo))
const instagram = computed(() => siteLink('instagram', 'https://www.instagram.com/idol_beads'))
const xiaohongshu = computed(() => siteLink('xiaohongshu', 'https://www.xiaohongshu.com/user/profile/650d5c8e00000000120075e5'))
const douyin = computed(() => siteLink('douyin', 'https://v.douyin.com/lQTCIhRoSAY/'))
const arrivalGuide = 'https://www.xiaohongshu.com/explore/6abcd1cc000000001203e0b5?app_platform=ios&app_version=9.49.1&share_from_user_hidden=true&xsec_source=app_share&type=normal&xsec_token=CBuPlDuJwPTtceKdj76OXmC_A-jxJV8M8UOKeufjdnKx8=&author_share=1&xhsshare=WeixinSession&shareRedId=ODg7REZIO0o2NzUyOTgwNjg0OTk6OTlP&apptime=1791468933&share_id=760d94f870f44c60b2df59bd8f26686e&wechatWid=6212a0e4a48431998387778190c73055&wechatOrigin=menu'

const routes = computed(() => [
  {
    station: 'Maxwell MRT',
    line: 'TE18',
    exit: t('footer_route_maxwell_exit'),
    steps: [
      t('footer_route_maxwell_step_1'),
      t('footer_route_maxwell_step_2'),
      t('footer_route_maxwell_step_3')
    ]
  },
  {
    station: 'Chinatown MRT',
    line: 'NE4 / DT19',
    exit: t('footer_route_chinatown_exit'),
    steps: [
      t('footer_route_chinatown_step_1'),
      t('footer_route_chinatown_step_2'),
      t('footer_route_chinatown_step_3')
    ]
  }
])
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
            <a v-if="douyin" :href="douyin" target="_blank" rel="noopener noreferrer" class="social-icon">{{ t('social_douyin') }} · IDOL Beads</a>
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
      <section class="footer-directions" aria-labelledby="footer-directions-title">
        <div class="footer-directions-heading">
          <div>
            <span class="footer-directions-kicker">GETTING HERE</span>
            <h3 id="footer-directions-title" class="footer-directions-title">{{ t('footer_directions_title') }}</h3>
            <p>{{ t('footer_directions_address') }}</p>
          </div>
          <a :href="arrivalGuide" target="_blank" rel="noopener noreferrer" class="footer-guide-link">
            {{ t('footer_directions_guide') }} <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div class="footer-route-grid">
          <article v-for="route in routes" :key="route.station" class="footer-route-card">
            <div class="footer-route-station">
              <span class="footer-route-icon" aria-hidden="true">🚇</span>
              <div><strong>{{ route.station }}</strong><small>{{ route.line }} · {{ route.exit }}</small></div>
            </div>
            <ol>
              <li v-for="step in route.steps" :key="step">{{ step }}</li>
            </ol>
          </article>
        </div>
      </section>
      <div class="footer-bottom">
        <p>&copy; 2026 {{ state.store?.name || 'IDOL BEADS' }}. All Rights Reserved.</p>
      </div>
    </div>
  </footer>
</template>
