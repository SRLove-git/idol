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
        <h1>{{ state.bookingEnabled ? t('booking_page_title') : t('booking_closed_title') }}</h1>
        <p>{{ state.bookingEnabled ? t('booking_page_desc') : t('booking_closed_desc') }}</p>
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
      <h1>{{ t('not_found_title') }}</h1>
      <p>{{ t('not_found_desc') }}</p>
      <a class="btn btn-primary" href="/">{{ t('back_home') }}</a>
    </section>
  </main>

  <SiteFooter />
  <WeChatModal />
</template>
