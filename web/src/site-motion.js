const revealSelectors = [
  '.hero-container',
  '.promo-carousel-stage',
  '.customer-reviews .reviews-title',
  '.membership-banner .membership-title',
  '.membership-banner .member-light-sign',
  '.highlights .section-title',
  '.highlights .highlights-cta',
  '.pricing > .container',
  '.booking > .container',
  '.page-hero > .container',
  '.works-gallery-heading',
  '.gallery-booking-card',
  '.auth-visual-content',
  '.auth-card',
  '.account-content',
  '.empty-page',
  '.site-footer > .container'
]

const staggerGroupSelectors = [
  '.reviews-grid',
  '.feature-grid',
  '.highlight-grid',
  '.membership-items',
  '.works-gallery-grid'
]

export function initSiteMotion(root = document) {
  const revealElements = [...root.querySelectorAll(revealSelectors.join(','))]
  const staggerElements = staggerGroupSelectors.flatMap((selector) => {
    const group = root.querySelector(selector)
    if (!group) return []
    return [...group.children].map((element, index) => {
      element.style.setProperty('--site-motion-delay', `${Math.min(index, 3) * 40}ms`)
      return element
    })
  })
  const elements = [...new Set([...revealElements, ...staggerElements])]

  elements.forEach((element) => element.classList.add('site-motion-reveal'))

  if (!('IntersectionObserver' in window)) {
    elements.forEach((element) => element.classList.add('is-site-motion-visible'))
    return () => {}
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      entry.target.classList.add('is-site-motion-visible')
      observer.unobserve(entry.target)
    })
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -6% 0px'
  })

  elements.forEach((element) => observer.observe(element))

  return () => observer.disconnect()
}
