<script setup>
import { siteImage } from '../site-images.js'

const signImage = siteImage('/photos/member-light-sign-v8.png')

defineProps({
  memberNo: { type: String, required: true },
  compact: { type: Boolean, default: false }
})
</script>

<template>
  <div class="member-light-sign" :class="{ 'is-compact': compact }" :style="{ '--member-sign-image': `url('${signImage}')` }" aria-label="会员灯牌">
    <img :src="signImage" alt="马卡龙黑金配色的标准圆角 IDOL BEADS VIP MEMBER 会员标识" loading="lazy" decoding="async" width="2035" height="773">
    <span class="member-light-chase" aria-hidden="true">
      <i class="is-top"></i>
      <i class="is-right"></i>
      <i class="is-bottom"></i>
      <i class="is-left"></i>
    </span>
    <strong>{{ memberNo }}</strong>
  </div>
</template>
