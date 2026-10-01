<script setup>
import { computed } from 'vue'
import { state, fmtPrice } from '../store.js'

const sixHour = computed(() =>
  state.store?.packages?.find((p) => Number(p.hours) === 6) ?? state.store?.packages?.[0]
)

const rows = computed(() => {
  const s = state.store
  const p = sixHour.value
  return [
    {
      duration: '1 小时 1HR Session',
      solo: fmtPrice(s?.price),
      member: fmtPrice(s?.memberPrice),
      group: fmtPrice(s?.groupPrice),
      star: false
    },
    {
      duration: '6 小时 6HR Session',
      solo: fmtPrice(p?.price),
      member: fmtPrice(p?.memberPrice),
      group: fmtPrice(p?.groupPrice),
      star: false
    },
    {
      duration: '全天不限时 Full-Day Pass',
      solo: fmtPrice(s?.allDayPrice),
      member: fmtPrice(s?.allDayMemberPrice),
      group: fmtPrice(s?.allDayGroupPrice),
      star: true
    }
  ]
})
</script>

<template>
  <section id="pricing" class="pricing">
    <div class="container">
      <h2 class="section-title">
        <span>价位表</span>
        <img src="/photos/price-title.png" alt="Pricing" class="title-icon">
      </h2>
      <div class="price-tables">
        <div class="price-card pricing-full">
          <div class="card-header">
            <img src="/photos/price-title.png" alt="Pricing" class="card-title-icon">
            <h3>价位表 · Pricing</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>时长 Duration</th>
                <th>单人 Single</th>
                <th>会员 Member (20% OFF)</th>
                <th>多人同行 2+ PAX (10% OFF)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.duration">
                <td>{{ r.duration }}</td>
                <td>{{ r.solo }}</td>
                <td>{{ r.member }}<span v-if="r.star" class="price-star"> ⭐</span></td>
                <td>{{ r.group }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>
