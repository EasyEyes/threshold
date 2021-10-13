export const showConsentForm = () => {
    // show markdown
    let el = document.getElementById('consent-form-pdf');
    el.style.zIndex = 999999;
    el.style.display = 'block'

    axios.get('/form/consentform.pdf')
    .then(function (response) {
      el.innerHTML = marked(response.data)
    })
    .catch(function (error) {
      console.log(error)
      
      hideConsentForm()

      // show pdf
      el = document.getElementById('consent-form-markdown');
      el.style.zIndex = 999999;
      el.style.display = 'block'
    })
 
  
}

export const hideConsentForm = () => {
  // hide markdown
  let el = document.getElementById('consent-form-markdown');
  el.style.zIndex = 0;
  el.style.display = 'none'

  // hide pdf
  el = document.getElementById('consent-form-pdf');
  el.style.zIndex = 0;
  el.style.display = 'none'

}