<script setup>
import { ref } from 'vue'
import { t, allHighlights } from '../store.js'

const initial = [
  { src: '/photos/show_24.webp', alt: 'Highlight 1' },
  { src: '/photos/show_25.jpg', alt: 'Highlight 2' },
  { src: '/photos/show_26.jpg', alt: 'Highlight 3' }
]
const extra = ref([])
let shown = 0

function loadMore() {
  const batch = allHighlights.slice(shown, shown + 3)
  shown += batch.length
  extra.value.push(...batch.map((src) => `/photos/${src.split('/').pop()}`))
}
</script>

<template>
  <section id="highlights" class="highlights">
    <div class="container">
      <h2 class="section-title">
        <span>{{ t('highlights_title') }}</span>
        <img src="/photos/high-title.png" alt="Highlight" class="title-icon">
      </h2>
      <div class="highlight-grid">
        <div v-for="img in initial" :key="img.src" class="highlight-item">
          <img :src="img.src" :alt="img.alt" loading="lazy" decoding="async">
        </div>
        <div v-for="(src, i) in extra" :key="'e' + i" class="highlight-item">
          <img :src="src" alt="Highlight" loading="lazy" decoding="async">
        </div>
      </div>
      <div v-if="shown < allHighlights.length" class="highlights-cta">
        <button type="button" class="btn btn-primary" @click="loadMore">
          <span>{{ t('btn_view_details') }}</span>
          <img src="/photos/view-details.png" alt="icon" class="btn-icon">
        </button>
      </div>
    </div>
  </section>
</template>
