<script setup>
import { computed } from 'vue'
import { state, t, fmtPrice } from '../store.js'

const hourly = computed(() => [
  { label: t('td_solo_label'), value: fmtPrice(state.store?.price) },
  { label: t('td_duo_label'), value: fmtPrice(state.store?.groupPrice ?? state.store?.price) }
])

const daypass = computed(() => {
  const allDay = state.store?.allDayPrice
  const surcharge = Number(state.store?.weekendSurchargePercent) || 0
  const weekend = allDay != null ? Number(allDay) * (1 + surcharge / 100) : null
  return [
    { label: t('td_wed_thu'), value: fmtPrice(allDay) },
    { label: t('td_fri_sun'), value: fmtPrice(weekend) }
  ]
})
</script>

<template>
  <section id="pricing" class="pricing">
    <div class="container">
      <h2 class="section-title">
        <span>{{ t('pricing_title') }}</span>
        <img src="/photos/price-title.png" alt="Pricing" class="title-icon">
      </h2>
      <div class="price-tables">
        <div class="price-card">
          <div class="card-header">
            <img src="/photos/hourly-icon.png" alt="Hourly" class="card-title-icon">
            <h3>{{ t('hourly_pricing') }}</h3>
          </div>
          <table>
            <thead>
              <tr><th>{{ t('th_people') }}</th><th>{{ t('th_price') }}</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in hourly" :key="r.label"><td>{{ r.label }}</td><td>{{ r.value }}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="price-card">
          <div class="card-header">
            <img src="/photos/daypass-icon.png" alt="Day Pass" class="card-title-icon">
            <h3>{{ t('daypass_pricing') }}</h3>
          </div>
          <table>
            <thead>
              <tr><th>{{ t('th_date') }}</th><th>{{ t('th_price') }}</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in daypass" :key="r.label"><td>{{ r.label }}</td><td>{{ r.value }}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>
