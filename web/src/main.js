import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

function trackWebsiteVisit() {
  try {
    const key = 'idol_beads_visitor_id'
    let visitorId = localStorage.getItem(key)
    if (!visitorId) {
      visitorId = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`
      localStorage.setItem(key, visitorId)
    }
    fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ visitorId, path: window.location.pathname }),
      keepalive: true
    }).catch(() => {})
  } catch { /* 访客禁用本地存储时不影响官网使用 */ }
}

createApp(App).mount('#app')
trackWebsiteVisit()
