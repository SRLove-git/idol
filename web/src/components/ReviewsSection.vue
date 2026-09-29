<script setup>
import { t } from '../store.js'

const reviews = [
  [
    'Absolutely love this place! I made this adorable pixel art piece and it even matches my nails perfectly 😭✨',
    'The store is super fun and creative, and everything is really well organized. The owner was incredibly friendly and welcoming, patiently explaining everything and making the whole experience even better.',
    'If you’re into DIY, pixel art, or just want a relaxing and cute activity, this is definitely a must-visit spot. I’ll 100% come back again!'
  ],
  [
    'I love this place! I want to go back already. The moment I walked in, I was greeted by this welcoming man who is fluent in English and Chinese.',
    'He was very helpful with guiding me through the perler bead stuff. It is a really nice space. It is a quiet place and I had so much fun listening to music and making the stuff I liked.',
    '10/10 place ❤️‍🩹❤️‍🩹❤️‍🩹❤️‍🩹'
  ],
  [
    'Had such a fun time making Perler bead art here! The staff was incredibly friendly and patient, guiding me through the entire process even though it was my first time.',
    'The shop is clean, relaxing, and perfect for a fun activity with friends, family, or a date. Highly recommend this place if you’re looking for a creative and enjoyable experience. I’ll definitely be back to make more designs!'
  ]
]
</script>

<template>
  <section class="customer-reviews">
    <div class="container">
      <h2 class="reviews-title">{{ t('reviews_title') }}</h2>
      <div class="reviews-grid">
        <article v-for="(r, i) in reviews" :key="i" class="review-card">
          <div class="review-quote">“</div>
          <p v-for="(p, j) in r" :key="j">{{ p }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
