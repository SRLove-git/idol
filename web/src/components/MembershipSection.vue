<script setup>
import { t } from '../store.js'

const rules = ['member_rule_1', 'member_rule_2', 'member_rule_3', 'member_rule_4', 'member_rule_5']
</script>

<template>
  <section class="membership-banner">
    <div class="container">
      <div class="membership-box">
        <h2 class="membership-title">
          <span>{{ t('member_title') }}</span>
          <img src="/photos/member-icon-5.png" alt="" class="membership-title-icon">
        </h2>
        <div class="membership-items">
          <div v-for="(rule, i) in rules" :key="rule" class="membership-item">
            <div class="membership-icon">
              <img :src="`/photos/member-icon-${i + 1}.png`" alt="">
            </div>
            <div class="membership-content">
              <div class="membership-main">
                <span>{{ t(rule) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
