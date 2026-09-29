<script setup>
import { onMounted } from 'vue'
import { loadStore } from './store.js'
import SiteHeader from './components/SiteHeader.vue'
import HeroSection from './components/HeroSection.vue'
import PromoCarousel from './components/PromoCarousel.vue'
import ReviewsSection from './components/ReviewsSection.vue'
import MembershipSection from './components/MembershipSection.vue'
import FeaturesSection from './components/FeaturesSection.vue'
import HighlightsSection from './components/HighlightsSection.vue'
import PricingSection from './components/PricingSection.vue'
import BookingSection from './components/BookingSection.vue'
import SiteFooter from './components/SiteFooter.vue'
import WeChatModal from './components/WeChatModal.vue'

onMounted(() => loadStore())
</script>

<template>
  <SiteHeader />
  <main>
    <HeroSection />
    <PromoCarousel />
    <ReviewsSection />
    <MembershipSection />
    <FeaturesSection />
    <HighlightsSection />
    <PricingSection />
    <BookingSection />
  </main>
  <SiteFooter />
  <WeChatModal />
</template>
