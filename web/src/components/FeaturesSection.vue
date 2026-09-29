<script setup>
import { t } from '../store.js'

const features = [
  { icon: 'feat-icon-1.png', title: 'feat1_title', desc: 'feat1_desc' },
  { icon: 'feat-icon-2.png', title: 'feat2_title', desc: 'feat2_desc' },
  { icon: 'feat-icon-3.png', title: 'feat3_title', desc: 'feat3_desc' },
  { icon: 'feat-icon-4.png', title: 'feat4_title', desc: 'feat4_desc' }
]
</script>

<template>
  <section class="features">
    <div class="container">
      <div class="feature-grid">
        <div v-for="f in features" :key="f.title" class="feature-item">
          <img :src="`/photos/${f.icon}`" alt="Icon" class="icon">
          <h3>{{ t(f.title) }}</h3>
          <p>{{ t(f.desc) }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
