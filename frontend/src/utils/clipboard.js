export function copyWithExecCommand(text) {
  let success = false;
  try {
    const el = document.createElement('textarea');
    el.value = text;
    // Make it hidden but still focusable and selectable
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    
    const selected = document.getSelection().rangeCount > 0 ? document.getSelection().getRangeAt(0) : false;
    
    el.select();
    el.setSelectionRange(0, 999999); // For mobile devices
    
    success = document.execCommand('copy');
    document.body.removeChild(el);

    if (selected) {
      document.getSelection().removeAllRanges();
      document.getSelection().addRange(selected);
    }
  } catch (err) {
    success = false;
  }
  return success;
}

export function copyToClipboard(text) {
  const value = text ? String(text).trim() : '';
  if (!value) return Promise.resolve(false);

  // Try modern Clipboard API first (only works on HTTPS or localhost)
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(value)
      .then(() => true)
      .catch(() => {
        // Fallback if clipboard API throws error (e.g. permission denied)
        return copyWithExecCommand(value);
      });
  }

  // Fallback for HTTP (insecure context)
  const success = copyWithExecCommand(value);
  return Promise.resolve(success);
}
