<script setup>
import { computed } from 'vue'
import { defaultReviews, state, t } from '../store.js'

const reviews = computed(() => {
  const configured = state.store?.siteContent?.reviews
  const source = Array.isArray(configured) && configured.length ? configured : defaultReviews
  return source.map((item) => ({
    image: item.image,
    alt: state.lang === 'zh' ? item.altZh : item.altEn,
    quote: state.lang === 'zh' ? item.quoteZh : item.quoteEn
  }))
})
</script>

<template>
  <section class="customer-reviews">
    <div class="container">
      <h2 class="reviews-title">{{ t('reviews_title') }}</h2>
      <div class="reviews-grid">
        <article v-for="(r, i) in reviews" :key="i" class="review-card">
          <div class="review-image-wrap">
            <img class="review-image" :src="r.image" :alt="r.alt" loading="lazy" decoding="async">
          </div>
          <div class="review-body">
            <div class="review-quote">“</div>
            <p>{{ r.quote }}</p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
