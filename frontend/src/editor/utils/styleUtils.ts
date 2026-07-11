import type { Editor } from 'grapesjs';
import useStore from '../../store/useStore';

/**
 * Encodes every non-ASCII character (emoji, symbols, multi-byte unicode) in an
 * HTML string to its numeric HTML entity form (e.g. ⚡ → &#x26A1;).
 *
 * GrapesJS re-parses HTML strings through its own internal parser which can
 * default to Latin-1 and corrupt multi-byte chars. Encoding them to ASCII-safe
 * entities prevents this entirely while keeping the visual output identical.
 */
export function encodeNonAscii(html: string): string {
  // eslint-disable-next-line no-control-regex
  return html.replace(/[^\x00-\x7F]/gu, (char) => {
    const cp = char.codePointAt(0);
    return cp !== undefined ? `&#x${cp.toString(16).toUpperCase()};` : char;
  });
}

/**
 * Transforms React component tags (<Button>, <Badge>, <Card>, etc.)
 * in template HTML into styled standard HTML elements.
 */
export function transformReactComponentsInHtml(html: string): string {
  if (!html?.trim()) return html;

  // Prefix meta charset so DOMParser treats the string as UTF-8.
  // Without this, DOMParser (text/html mode) defaults to Latin-1 and
  // corrupts multi-byte characters like emoji (⚜ ⚡ ✓ ✗ ⚠ etc.).
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<html><head><meta charset="utf-8"></head><body>${html}</body></html>`,
    'text/html'
  );

  // Helpers for mapping components
  const mapButton = (el: Element) => {
    const variant = el.getAttribute('variant') || 'secondary';
    const size = el.getAttribute('size') || 'md';
    const existingClass = el.getAttribute('class') || '';

    const variants: Record<string, string> = {
      primary: 'bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-50',
      secondary: 'bg-bg-muted text-fg hover:bg-bg-subtle border border-border',
      ghost: 'text-fg-muted hover:text-fg hover:bg-bg-muted',
      danger: 'bg-danger text-danger-fg hover:bg-danger-hover disabled:opacity-50',
      outline: 'border border-border text-fg hover:bg-bg-subtle hover:border-border-strong bg-bg-elevated',
    };

    const sizes: Record<string, string> = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-2.5 text-sm',
    };

    const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-220 ease-[cubic-bezier(0.2,0,0,1)] disabled:cursor-not-allowed rounded-lg';
    const combinedClass = `${baseClasses} ${variants[variant] || variants.secondary} ${sizes[size] || sizes.md} ${existingClass}`.trim();
    el.setAttribute('class', combinedClass);
    el.setAttribute('data-tc-type', 'button');
  };

  const mapBadge = (el: Element) => {
    const variant = el.getAttribute('variant') || 'default';
    const existingClass = el.getAttribute('class') || '';

    const variants: Record<string, string> = {
      default: 'bg-bg-subtle text-fg-muted border border-border',
      success: 'bg-success-muted text-success-fg border border-success/20',
      warning: 'bg-warning-muted text-warning-fg border border-warning/20',
      primary: 'bg-accent-muted text-accent border border-accent/20',
    };

    const baseClasses = 'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md';
    const combinedClass = `${baseClasses} ${variants[variant] || variants.default} ${existingClass}`.trim();
    el.setAttribute('class', combinedClass);
  };

  const mapCard = (el: Element) => {
    const interactive = el.getAttribute('interactive') === 'true' || el.hasAttribute('interactive');
    const existingClass = el.getAttribute('class') || '';

    const base = interactive ? 'surface-card-interactive cursor-pointer' : 'surface-card';
    const combinedClass = `${base} ${existingClass}`.trim();
    el.setAttribute('class', combinedClass);
  };

  // Helper to replace tag
  const replaceTag = (el: Element, newTagName: string): Element => {
    const newEl = doc.createElement(newTagName);
    Array.from(el.attributes).forEach(attr => {
      newEl.setAttribute(attr.name, attr.value);
    });
    while (el.firstChild) {
      newEl.appendChild(el.firstChild);
    }
    el.parentNode?.replaceChild(newEl, el);
    return newEl;
  };

  // 1. Process custom tags (React component tags parsed in HTML DOM)
  // DOMParser parses unknown tags like <Button> or <Button-Block> or <Card> or <Badge>
  // as uppercase nodes in text/html.
  const tagsToProcess = ['BUTTON-BLOCK', 'REACT-BUTTON', 'BADGE', 'CARD', 'BUTTON'];
  
  tagsToProcess.forEach(tag => {
    doc.querySelectorAll(tag).forEach(el => {
      if (tag === 'BUTTON-BLOCK' || tag === 'REACT-BUTTON') {
        const newEl = replaceTag(el, 'button');
        mapButton(newEl);
      } else if (tag === 'BUTTON') {
        mapButton(el);
      } else if (tag === 'BADGE') {
        const newEl = replaceTag(el, 'span');
        mapBadge(newEl);
      } else if (tag === 'CARD') {
        const newEl = replaceTag(el, 'div');
        mapCard(newEl);
      }
    });
  });

  // 2. Also process standard tags with specific classes or attributes as fallback
  doc.querySelectorAll('span[variant]').forEach(mapBadge);
  doc.querySelectorAll('div[interactive]').forEach(mapCard);
  doc.querySelectorAll('a[data-tc-type="button"], button[variant]').forEach(mapButton);

  return doc.body.innerHTML;
}

/**
 * Injects host styles and stylesheets into the GrapesJS iframe canvas.
 */
export function injectStylesheetsIntoCanvas(editor: Editor): void {
  const iframeDoc = editor.Canvas.getDocument();
  if (!iframeDoc) return;

  const head = iframeDoc.head;
  if (!head) return;

  // 1. Font and icon CDNs
  const defaultStyles = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
    'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  ];

  defaultStyles.forEach(href => {
    if (!head.querySelector(`link[href="${href}"]`)) {
      const link = iframeDoc.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      head.appendChild(link);
    }
  });

  // 2. Host Link Sheets
  Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach((linkEl: any) => {
    if (linkEl.href && !head.querySelector(`link[href="${linkEl.href}"]`)) {
      const link = iframeDoc.createElement('link');
      link.rel = 'stylesheet';
      link.href = linkEl.href;
      head.appendChild(link);
    }
  });

  // 3. Host Style Elements (globals, modules, Vite dynamic styles)
  // IMPORTANT: Skip Tailwind preflight/base styles — they reset `display`, margins etc.
  // and break inline-styled template layouts in the canvas iframe.
  Array.from(document.querySelectorAll('style')).forEach((styleEl: any, index) => {
    const cssText = styleEl.innerHTML;
    if (!cssText) return;
    // Skip GrapesJS own styles, Tailwind preflight/reset, and :root variable blocks
    const isTailwindReset = cssText.includes('--tw-') || cssText.includes('@layer base') || cssText.includes('tailwindcss') || cssText.includes('*, ::before, ::after') || cssText.includes('*, :before, :after');
    const isGjsStyle = cssText.includes('.gjs-');
    if (isTailwindReset || isGjsStyle) return;

    const styleId = styleEl.id || `tc-host-style-${index}`;
    if (!iframeDoc.getElementById(styleId)) {
      const style = iframeDoc.createElement('style');
      style.id = styleId;
      style.innerHTML = cssText;
      head.appendChild(style);
    }
  });
}

/**
 * Validates whether the document head contains Google Fonts and icon libraries.
 * Returns a list of missing resource descriptions.
 */
export function validateStylesheets(doc: Document): string[] {
  const missing: string[] = [];
  const htmlContent = doc.documentElement.innerHTML || '';

  // Google Fonts Check
  const hasFonts = htmlContent.includes('fonts.googleapis.com') ||
                   Array.from(doc.querySelectorAll('link')).some(l => l.href && l.href.includes('fonts.googleapis.com')) ||
                   Array.from(doc.querySelectorAll('style')).some(s => s.innerHTML.includes('fonts.googleapis.com'));
  if (!hasFonts) {
    missing.push('Google Fonts (Inter/Outfit/Plus Jakarta Sans)');
  }

  // Tailwind is bundled into the host app (Vite + @import "tailwindcss") but is intentionally
  // NOT copied into the GrapesJS canvas iframe — preflight resets break inline-styled templates.
  // Campaign funnel pages use inline styles, so skip this check on the canvas document.

  // Icon Library Check (Tabler / FontAwesome)
  const hasIcons = htmlContent.includes('tabler-icons') || htmlContent.includes('font-awesome') || htmlContent.includes('fontawesome') ||
                   Array.from(doc.querySelectorAll('link')).some(l => l.href && (l.href.includes('tabler') || l.href.includes('font-awesome') || l.href.includes('fontawesome')));
  if (!hasIcons) {
    missing.push('Icon Libraries (Tabler Icons or FontAwesome)');
  }

  return missing;
}

/**
 * Fetches all active CSS rules from the runtime application document stylesheets.
 */
export function getActiveStylesheetsContent(): string {
  let cssText = '';
  try {
    const sheets = Array.from(document.styleSheets);
    sheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules);
        rules.forEach(rule => {
          if (!rule.cssText.includes('.gjs-') && !rule.cssText.includes('grapesjs')) {
            cssText += rule.cssText + '\n';
          }
        });
      } catch (e) {
        // Fallback for CORS cross-origin stylesheets
      }
    });
  } catch (e) {
    console.error('[styleUtils] Failed to get stylesheets content:', e);
  }
  return cssText;
}

/**
 * Runs validation checks in development mode and displays toasts / logs warnings if errors.
 */
export function runDevModeStylesValidation(doc: Document): void {
  const isDev = import.meta.env.DEV;
  if (!isDev) return;

  const missing = validateStylesheets(doc);
  if (missing.length > 0) {
    const msg = `[TemplateCraft Dev Warning] Missing stylesheet imports: ${missing.join(', ')}. Elements may render without styles.`;
    console.warn(msg);
    const addToast = useStore.getState().addToast;
    if (typeof addToast === 'function') {
      addToast(`Dev Warning: Missing stylesheet imports: ${missing.join(', ')}`, 'warning');
    }
  }
}
