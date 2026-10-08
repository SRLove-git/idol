<script setup>
import { computed, onMounted } from 'vue'
import { loadStore, state, t } from './store.js'
import SiteHeader from './components/SiteHeader.vue'
import HeroSection from './components/HeroSection.vue'
import PromoCarousel from './components/PromoCarousel.vue'
import ReviewsSection from './components/ReviewsSection.vue'
import MembershipSection from './components/MembershipSection.vue'
import FeaturesSection from './components/FeaturesSection.vue'
import HighlightsSection from './components/HighlightsSection.vue'
import HighlightsPage from './components/HighlightsPage.vue'
import PricingSection from './components/PricingSection.vue'
import BookingSection from './components/BookingSection.vue'
import AuthPage from './components/AuthPage.vue'
import AccountPage from './components/AccountPage.vue'
import SiteFooter from './components/SiteFooter.vue'
import WeChatModal from './components/WeChatModal.vue'

const route = computed(() => window.location.pathname.replace(/\/+$/, '') || '/')
const isHome = computed(() => route.value === '/')
const isBooking = computed(() => route.value === '/booking')
const isHighlights = computed(() => route.value === '/highlights')
const isLogin = computed(() => route.value === '/login')
const isRegister = computed(() => route.value === '/register')
const isAccount = computed(() => route.value === '/account')

onMounted(() => loadStore())
</script>

<template>
  <SiteHeader />

  <main v-if="isHome">
    <HeroSection />
    <PromoCarousel />
    <ReviewsSection />
    <MembershipSection />
    <FeaturesSection />
    <HighlightsSection />
    <PricingSection />
    <BookingSection />
  </main>

  <main v-else-if="isBooking" class="page-main">
    <section class="page-hero page-hero-booking">
      <div class="container">
        <span class="page-kicker">{{ state.bookingEnabled ? 'BOOK YOUR SESSION' : 'OPENING SOON' }}</span>
        <h1>{{ state.bookingEnabled ? '预约 IDOL BEADS' : t('booking_closed_title') }}</h1>
        <p>{{ state.bookingEnabled ? '无需登录，填写邮箱即可预约；已有账号会自动关联到你的预约记录。' : t('booking_closed_desc') }}</p>
      </div>
    </section>
    <BookingSection :standalone="true" />
  </main>

  <HighlightsPage v-else-if="isHighlights" />

  <AuthPage v-else-if="isLogin || isRegister" :mode="isLogin ? 'login' : 'register'" />
  <AccountPage v-else-if="isAccount" />

  <main v-else class="page-main">
    <section class="empty-page container">
      <span>404</span>
      <h1>页面走丢了</h1>
      <p>这个链接已经不存在，返回首页继续浏览吧。</p>
      <a class="btn btn-primary" href="/">返回首页</a>
    </section>
  </main>

  <SiteFooter />
  <WeChatModal />
</template>
