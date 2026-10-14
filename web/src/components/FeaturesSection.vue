<script setup>
import { computed } from 'vue'
import { defaultSiteMedia, siteMedia, state, t } from '../store.js'

const features = computed(() => {
  const icons = siteMedia('featureIcons', defaultSiteMedia.featureIcons)
  return [1, 2, 3, 4].map((n, index) => ({
    icon: icons[index] || defaultSiteMedia.featureIcons[index],
    title: `feat${n}_title`,
    desc: `feat${n}_desc`,
    campaign: n === 4
  }))
})

const campaignRewards = computed(() => [
  { likes: 30, months: 1 },
  { likes: 60, months: 2 },
  { likes: 100, months: 3 }
])
</script>

<template>
  <section class="features">
    <div class="container">
      <div class="feature-grid">
        <div v-for="f in features" :key="f.title" class="feature-item" :class="{ 'feature-item-campaign': f.campaign }">
          <div class="feature-item-icon">
            <img :src="f.icon" alt="" class="icon">
          </div>
          <div class="feature-item-copy">
            <span v-if="f.campaign" class="campaign-kicker">REDNOTE REWARDS · {{ state.lang === 'zh' ? '限时会员福利' : 'MEMBERSHIP REWARDS' }}</span>
            <h3>{{ t(f.title) }}</h3>
            <p>{{ t(f.desc) }}</p>
          </div>
          <div v-if="f.campaign" class="campaign-rewards" :aria-label="state.lang === 'zh' ? '集赞奖励' : 'Like rewards'">
            <div v-for="reward in campaignRewards" :key="reward.likes" class="campaign-reward">
              <span><strong>{{ reward.likes }}</strong>{{ state.lang === 'zh' ? '赞' : ' likes' }}</span>
              <em>{{ reward.months }} {{ state.lang === 'zh' ? '个月会员' : reward.months === 1 ? 'month' : 'months' }}</em>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
