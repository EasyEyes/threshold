export const showConsentForm = () => {
  const el = document.getElementById('consent-form');
  el.style.zIndex = 1000;
  el.style.display = 'block'
}

export const hideConsentForm = () => {
  const el = document.getElementById('consent-form');
  el.style.zIndex = 0;
  el.style.opacity = 'none'

}