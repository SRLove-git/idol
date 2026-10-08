<script setup>
import { computed } from 'vue'
import { defaultSiteMedia, siteMedia, t } from '../store.js'

const features = computed(() => {
  const icons = siteMedia('featureIcons', defaultSiteMedia.featureIcons)
  return [1, 2, 3, 4].map((n, index) => ({
    icon: icons[index] || defaultSiteMedia.featureIcons[index],
    title: `feat${n}_title`,
    desc: `feat${n}_desc`
  }))
})
</script>

<template>
  <section class="features">
    <div class="container">
      <div class="feature-grid">
        <div v-for="f in features" :key="f.title" class="feature-item">
          <img :src="f.icon" alt="Icon" class="icon">
          <h3>{{ t(f.title) }}</h3>
          <p>{{ t(f.desc) }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
