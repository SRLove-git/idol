<script setup>
defineProps({
  memberNo: { type: String, required: true },
  compact: { type: Boolean, default: false }
})
</script>

<template>
  <div class="member-light-sign" :class="{ 'is-compact': compact }" aria-label="会员灯牌">
    <img :src="'/photos/member-light-sign-v7.png'" alt="马卡龙黑金配色的标准圆角 IDOL BEADS VIP MEMBER 会员标识">
    <span class="member-light-chase" aria-hidden="true">
      <i class="is-top"></i>
      <i class="is-right"></i>
      <i class="is-bottom"></i>
      <i class="is-left"></i>
    </span>
    <strong>{{ memberNo }}</strong>
  </div>
</template>
