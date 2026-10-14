<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { defaultSiteMedia, siteMedia, state, t } from '../store.js'

const activeIndex = ref(-1)
const visibleCount = ref(16)
const loadSentinel = ref(null)
const galleryBatchSize = 12
const defaultGalleryImages = new Set(defaultSiteMedia.galleryImages)
let galleryObserver = null

function thumbnailSource(src) {
  if (!defaultGalleryImages.has(src) || !src.startsWith('/photos/')) return src
  return src.replace('/photos/', '/photos/thumbnails/')
}

const images = computed(() => {
  const paths = siteMedia('galleryImages', defaultSiteMedia.galleryImages)

  return [...new Set(paths)].map((src, index) => ({
    src,
    thumbnailSrc: thumbnailSource(src),
    alt: state.lang === 'zh' ? `拼豆精选作品 ${index + 1}` : `Featured bead creation ${index + 1}`
  }))
})

const visibleImages = computed(() => images.value.slice(0, visibleCount.value))
const activeImage = computed(() => images.value[activeIndex.value] || null)

function openLightbox(index) {
  activeIndex.value = index
  document.body.classList.add('lightbox-open')
}

function closeLightbox() {
  activeIndex.value = -1
  document.body.classList.remove('lightbox-open')
}

function showPrevious() {
  activeIndex.value = (activeIndex.value - 1 + images.value.length) % images.value.length
}

function showNext() {
  activeIndex.value = (activeIndex.value + 1) % images.value.length
}

function handleKeydown(event) {
  if (!activeImage.value) return
  if (event.key === 'Escape') closeLightbox()
  if (event.key === 'ArrowLeft') showPrevious()
  if (event.key === 'ArrowRight') showNext()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)

  if (!('IntersectionObserver' in window)) {
    visibleCount.value = images.value.length
    return
  }

  galleryObserver = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) return
    visibleCount.value = Math.min(visibleCount.value + galleryBatchSize, images.value.length)
  }, { rootMargin: '800px 0px' })

  if (loadSentinel.value) galleryObserver.observe(loadSentinel.value)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  galleryObserver?.disconnect()
  document.body.classList.remove('lightbox-open')
})
</script>

<template>
  <main class="page-main highlights-page">
    <section class="highlights-page-hero">
      <div class="container">
        <a class="gallery-back-link" href="/">
          <span aria-hidden="true">←</span> {{ t('highlights_back_home') }}
        </a>
        <span class="page-kicker">{{ t('highlights_page_kicker') }}</span>
        <h1>{{ t('highlights_page_title') }}</h1>
        <p class="highlights-page-desc">{{ t('highlights_page_desc') }}</p>
      </div>
    </section>

    <section class="works-gallery-section">
      <div class="container works-gallery-container">
        <div class="works-gallery-heading">
          <div>
            <span>INSPIRATION WALL</span>
            <h2>{{ t('highlights_gallery_label') }}</h2>
          </div>
          <p><strong>{{ images.length }}</strong> {{ t('highlights_gallery_count') }}</p>
        </div>

        <div class="works-gallery-grid">
          <button
            v-for="(image, index) in visibleImages"
            :key="image.src"
            class="works-gallery-card"
            type="button"
            :aria-label="image.alt"
            @click="openLightbox(index)"
          >
            <img
              :src="image.thumbnailSrc"
              :alt="image.alt"
              :loading="index < 4 ? 'eager' : 'lazy'"
              decoding="async"
              :fetchpriority="index < 4 ? 'high' : 'low'"
            >
            <span class="works-gallery-card-overlay" aria-hidden="true">
              <span>+</span>
            </span>
          </button>
        </div>
        <div
          v-if="visibleImages.length < images.length"
          ref="loadSentinel"
          class="works-gallery-load-sentinel"
          aria-hidden="true"
        ></div>

        <aside class="gallery-booking-card">
          <img src="/photos/high-title.png" alt="" aria-hidden="true">
          <div>
            <h2>{{ t('highlights_book_title') }}</h2>
            <p>{{ t('highlights_book_desc') }}</p>
          </div>
          <a v-if="state.bookingEnabled" class="btn btn-primary" href="/booking">{{ t('highlights_book_button') }}</a>
          <span v-else class="btn btn-disabled">{{ t('booking_closed_title') }}</span>
        </aside>
      </div>
    </section>

    <div
      v-if="activeImage"
      class="works-lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="activeImage.alt"
      @click.self="closeLightbox"
    >
      <button class="works-lightbox-close" type="button" :aria-label="t('gallery_close')" @click="closeLightbox">×</button>
      <button class="works-lightbox-nav is-prev" type="button" :aria-label="t('gallery_previous')" @click="showPrevious">‹</button>
      <figure>
        <img :src="activeImage.src" :alt="activeImage.alt">
        <figcaption>{{ activeIndex + 1 }} / {{ images.length }}</figcaption>
      </figure>
      <button class="works-lightbox-nav is-next" type="button" :aria-label="t('gallery_next')" @click="showNext">›</button>
    </div>
  </main>
</template>
