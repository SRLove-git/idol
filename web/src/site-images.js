import optimizedImages from './optimized-images.json'

// Only substitute known bundled originals; uploaded and external images keep their URLs.
export function siteImage(src) {
  return Object.hasOwn(optimizedImages, src) ? optimizedImages[src] : src
}
