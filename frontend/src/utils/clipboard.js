export function copyWithExecCommand(text) {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.setAttribute('readonly', 'true');
    textarea.style.fontSize = '16px'; 

    document.body.appendChild(textarea);

    const isIOS = typeof navigator !== 'undefined' && /ipad|iphone/i.test(navigator.userAgent || '');

    if (isIOS) {
      const range = document.createRange();
      range.selectNodeContents(textarea);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      textarea.setSelectionRange(0, 999999);
    } else {
      textarea.focus();
      textarea.select();
    }

    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (err) {
      ok = false;
    }

    document.body.removeChild(textarea);
    return ok;
  } catch (error) {
    return false;
  }
}

export function copyToClipboard(text) {
  const value = text ? String(text).trim() : '';
  if (!value) return Promise.resolve(false);

  if (typeof window !== 'undefined' && window.isSecureContext && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value)
      .then(() => true)
      .catch(() => false);
  }

  // Executed synchronously on HTTP to preserve user gesture
  const success = copyWithExecCommand(value);
  return Promise.resolve(success);
}
