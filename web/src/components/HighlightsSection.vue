<script setup>
import { computed } from 'vue'
import { defaultSiteMedia, siteMedia, state, t } from '../store.js'

const highlights = computed(() => siteMedia('featuredHighlights', defaultSiteMedia.featuredHighlights))
</script>

<template>
  <section id="highlights" class="highlights">
    <div class="container">
      <h2 class="section-title">
        <span>{{ t('highlights_title') }}</span>
        <img src="/photos/high-title.png" alt="Highlight" class="title-icon">
      </h2>
      <div class="highlight-grid">
        <div v-for="(src, index) in highlights" :key="src" class="highlight-item">
          <img :src="src" :alt="state.lang === 'zh' ? `拼豆精选作品 ${index + 1}` : `Featured bead creation ${index + 1}`" loading="lazy" decoding="async">
        </div>
      </div>
      <div class="highlights-cta">
        <a class="btn btn-primary" href="/highlights">
          <span>{{ t('btn_view_details') }}</span>
          <img src="/photos/view-details.png" alt="icon" class="btn-icon">
        </a>
      </div>
    </div>
  </section>
</template>
