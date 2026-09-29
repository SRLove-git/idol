<script setup>
import { state, t } from '../store.js'
</script>

<template>
  <div v-if="state.wechat" class="modal" @click.self="state.wechat = false">
    <div class="modal-content">
      <span class="close-modal" @click="state.wechat = false">&times;</span>
      <img src="/photos/wechat-qr.png" alt="WeChat QR Code" class="qr-code-img">
      <p>{{ t('wechat_scan_tip') }}</p>
    </div>
  </div>
</template>
