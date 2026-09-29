<script setup>
import { state, t } from '../store.js'
</script>

<template>
  <header>
    <div class="container">
      <div class="logo">
        <img src="/photos/logo.jpg" alt="Logo" class="header-logo">
        <span style="font-family: 'ZCOOL KuaiLe', cursive;">{{ state.store?.name || 'IDOL BEADS' }}</span>
      </div>
      <nav>
        <ul>
          <li><a href="#home">{{ t('nav_home') }}</a></li>
          <li><a href="#pricing">{{ t('nav_pricing') }}</a></li>
          <li><a href="#booking">{{ t('nav_booking') }}</a></li>
          <li><a href="#social">{{ t('nav_social') }}</a></li>
          <li class="lang-switch">
            <select v-model="state.lang">
              <option value="zh">Chinese</option>
              <option value="en">English</option>
            </select>
          </li>
        </ul>
      </nav>
    </div>
  </header>
</template>
