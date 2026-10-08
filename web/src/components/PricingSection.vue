<script setup>
import { computed } from 'vue'
import { state, fmtPrice, t } from '../store.js'

const sixHour = computed(() =>
  state.store?.packages?.find((p) => Number(p.hours) === 6) ?? state.store?.packages?.[0]
)

const rows = computed(() => {
  const s = state.store
  const p = sixHour.value
  return [
    {
      duration: t('pricing_duration_one'),
      solo: fmtPrice(s?.price),
      member: fmtPrice(s?.memberPrice),
      group: fmtPrice(s?.groupPrice),
      star: false
    },
    {
      duration: t('pricing_duration_six'),
      solo: fmtPrice(p?.price),
      member: fmtPrice(p?.memberPrice),
      group: fmtPrice(p?.groupPrice),
      star: false
    },
    {
      duration: t('pricing_duration_day'),
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
        <span>{{ t('pricing_title') }}</span>
        <img src="/photos/price-title.png" alt="Pricing" class="title-icon">
      </h2>
      <div class="price-tables">
        <div class="price-card pricing-full">
          <div class="card-header">
            <img src="/photos/price-title.png" alt="Pricing" class="card-title-icon">
            <h3>{{ t('pricing_card_title') }}</h3>
          </div>
          <div class="price-table-scroll">
            <table class="pricing-table">
              <thead>
                <tr>
                  <th>{{ t('pricing_th_duration') }}</th>
                  <th>{{ t('pricing_th_single') }}</th>
                  <th>{{ t('pricing_th_member') }}</th>
                  <th>{{ t('pricing_th_group') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in rows" :key="r.duration">
                  <td>{{ r.duration }}</td>
                  <td :data-label="t('pricing_th_single')">{{ r.solo }}</td>
                  <td :data-label="t('pricing_th_member')">{{ r.member }}<span v-if="r.star" class="price-star"> ⭐</span></td>
                  <td :data-label="t('pricing_th_group')">{{ r.group }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pricing-notes">
            <h4>{{ t('pricing_note_title') }}</h4>
            <p>{{ t('pricing_note_membership') }}</p>
            <p>{{ t('pricing_note_benefits') }}</p>
            <p>{{ t('pricing_note_group') }}</p>
            <p>{{ t('pricing_note_weekend') }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
