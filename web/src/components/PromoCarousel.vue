<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { defaultSiteMedia, siteMedia } from '../store.js'

const banners = computed(() => {
  const configured = siteMedia('banners', defaultSiteMedia.banners)
  return Array.isArray(configured) && configured.length ? configured : defaultSiteMedia.banners
})
const current = ref(0)
let timer = null

function stop() {
  if (timer) clearInterval(timer)
  timer = null
}
function restart() {
  stop()
  timer = setInterval(() => go(current.value + 1), 5000)
}
function go(i) {
  current.value = (i + banners.value.length) % banners.value.length
  restart()
}

onMounted(restart)
onBeforeUnmount(stop)
</script>

<template>
  <section class="promo-carousel" aria-label="活动图片轮播">
    <div class="promo-carousel-wrapper">
      <div class="promo-carousel-track">
        <div v-for="(b, i) in banners" :key="b" class="promo-slide" :class="{ active: i === current }" :aria-hidden="i !== current">
          <img :src="b" :alt="`promotion ${i + 1}`" draggable="false" loading="lazy" decoding="async">
        </div>
      </div>
      <button type="button" class="promo-carousel-btn promo-carousel-prev" aria-label="上一张图片" @click="go(current - 1)">&#10094;</button>
      <button type="button" class="promo-carousel-btn promo-carousel-next" aria-label="下一张图片" @click="go(current + 1)">&#10095;</button>
      <div class="promo-carousel-dots" aria-label="轮播图导航">
        <button
          v-for="(b, i) in banners"
          :key="'d' + i"
          type="button"
          class="promo-dot"
          :class="{ active: i === current }"
          :aria-current="i === current"
          :aria-label="`显示第 ${i + 1} 张图片`"
          @click="go(i)"
        ></button>
      </div>
    </div>
  </section>
</template>
