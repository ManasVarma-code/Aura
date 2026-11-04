/** Keep SPA submissions in JavaScript when the viewer disallows native form navigation. */
export function installPreviewFormSupport() {
  function submit(form) {
    if (form.reportValidity()) {
      form.dispatchEvent(new Event('submit', { bubbles:true, cancelable:true }));
    }
  }
  document.addEventListener('click', event => {
    if (event.defaultPrevented || !event.target?.closest) return;
    const control = event.target.closest('button,input[type="submit"]');
    if (!control?.form || control.type !== 'submit' || control.disabled) return;
    event.preventDefault();
    submit(control.form);
  });
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.key !== 'Enter') return;
    const control = event.target;
    if (!(control instanceof HTMLInputElement) || !control.form) return;
    if (!['text','email','password','search','tel','url','number'].includes(control.type)) return;
    event.preventDefault();
    const enabled = control.form.querySelector('button[type="submit"]:not(:disabled),button:not([type]):not(:disabled),input[type="submit"]:not(:disabled)');
    if (enabled) submit(control.form);
  });
}
