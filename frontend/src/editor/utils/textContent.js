import { safeGetWrapper } from './editorUtils';

const INLINE_TEXT_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'label', 'li', 'strong', 'em', 'small']);
const CONTAINER_TAGS = new Set(['section', 'header', 'footer', 'nav', 'main', 'article', 'form', 'ul', 'ol', 'table', 'tbody', 'thead', 'tr', 'td', 'th']);

const CONTENT_SET_OPTS = { fromDisable: 1 };

export function isTextLikeTag(tag) {
  return INLINE_TEXT_TAGS.has(tag.toLowerCase());
}

export function isTextLikeComponent(component) {
  return shouldConfigureAsText(component);
}

function hasComponentChildren(component) {
  return component.components().length > 0;
}

export function shouldConfigureAsText(component) {
  const tag = (component.get('tagName') || '').toLowerCase();
  const type = component.get('type') || '';
  const attrs = component.getAttributes?.() || {};

  if (type === 'wrapper' || type === 'image' || tag === 'img') return false;
  if (CONTAINER_TAGS.has(tag)) return false;
  if (hasComponentChildren(component)) return false;

  if (type === 'text' || attrs['data-gjs-type'] === 'text') return true;
  if (INLINE_TEXT_TAGS.has(tag)) return true;

  return false;
}

function stripHtml(html) {
  // Do not .trim() — PropertyPanel controlled inputs re-read this on every
  // keystroke; trimming would swallow trailing spaces as the user types.
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function setModelContent(component, value) {
  component.set('content', value, CONTENT_SET_OPTS);
}

export function configureAsTextComponent(component) {
  if (!shouldConfigureAsText(component)) return;

  const tag = (component.get('tagName') || '').toLowerCase();
  const type = component.get('type') || '';

  if (tag === 'a' || tag === 'button' || type === 'link') {
    component.set({
      editable: true,
      highlightable: true,
      hoverable: true,
      selectable: true,
    });
    return;
  }

  const el = component.getEl?.();
  const domText = el?.textContent?.trim() || '';
  const modelContent = component.get('content');
  const content = typeof modelContent === 'string' && modelContent.trim() ? modelContent : domText;

  if (type === 'text') {
    component.set({
      content,
      editable: true,
      highlightable: true,
      hoverable: true,
      selectable: true,
      droppable: false,
    });
    return;
  }

  component.set({
    type: 'text',
    tagName: tag || 'p',
    content,
    editable: true,
    highlightable: true,
    hoverable: true,
    selectable: true,
    droppable: false,
  });
}

export function getTextContent(component) {
  const raw = component.get('content');
  if (typeof raw === 'string' && raw.length > 0) {
    // Trust model whenever it has characters (including trailing spaces).
    return stripHtml(raw);
  }
  const el = component.getEl?.();
  if (el) {
    const dom = el.textContent || '';
    if (dom.length > 0) return dom;
  }
  // Explicit empty after user cleared, or unset
  return typeof raw === 'string' ? stripHtml(raw) : '';
}

export function setTextContent(component, value, _editor) {
  if (component.get('type') !== 'text' && shouldConfigureAsText(component)) {
    configureAsTextComponent(component);
  }
  setModelContent(component, value);
  syncComponentDomText(component, value);
}

/** Buttons / links / CTAs whose label is edited from the property panel. */
export function isCtaLabelComponent(component) {
  if (!component) return false;
  const tag = (component.get('tagName') || '').toLowerCase();
  const type = component.get('type') || '';
  const attrs = component.getAttributes?.() || {};
  const tcType = attrs['data-tc-type'];
  if (tcType === 'hotspot') return false;
  if (tag === 'button' || tag === 'a' || type === 'link' || tcType === 'button') return true;
  return false;
}

function syncComponentDomText(component, value) {
  const el = component.getEl?.();
  if (el) el.textContent = value;
}

function refreshComponentView(component, editor) {
  try {
    const view = component.getView?.() || component.view;
    if (view?.render) view.render();
  } catch (_) {
    /* noop */
  }
  try {
    editor?.Canvas?.refresh?.();
  } catch (_) {
    /* noop */
  }
}

/**
 * Read CTA / button label. Prefer live DOM so sidebar matches canvas after edits.
 */
export function getLinkText(component) {
  if (!component) return '';

  const children = component.components?.() || { length: 0 };
  if (children.length === 1) {
    const first = children.at?.(0);
    if (first?.get?.('type') === 'textnode') {
      const nodeText = first.get('content');
      if (typeof nodeText === 'string') return nodeText;
    }
  }

  const el = component.getEl?.();
  if (el) return String(el.textContent || '');

  const raw = component.get('content');
  if (typeof raw === 'string') return stripHtml(raw);
  return '';
}

/**
 * Set CTA / button label on model + DOM for `<button>`, `<a>`, and data-tc-type=button.
 * GrapesJS `set('content')` alone does not update button DOM — that caused blank canvas labels.
 */
export function setLinkText(component, value, editor) {
  if (!component) return;

  const text = value == null ? '' : String(value);

  if (!isCtaLabelComponent(component)) {
    setTextContent(component, text, editor);
    return;
  }

  const children = component.components();
  if (children.length === 0) {
    setModelContent(component, text);
    syncComponentDomText(component, text);
    refreshComponentView(component, editor);
    return;
  }

  const first = children.at(0);
  if (children.length === 1 && first?.get('type') === 'textnode') {
    first.set('content', text);
    syncComponentDomText(component, text);
    refreshComponentView(component, editor);
    return;
  }

  // Nested markup inside the CTA — replace with plain label text
  children.reset();
  setModelContent(component, text);
  try {
    component.append(text);
  } catch (_) {
    syncComponentDomText(component, text);
  }
  syncComponentDomText(component, text);
  refreshComponentView(component, editor);
}

export function walkComponents(component, fn) {
  fn(component);
  component.components().forEach((child) => walkComponents(child, fn));
}

let textSetupRetryCount = 0;
const MAX_TEXT_SETUP_RETRIES = 5;

export function ensureAllTextEditable(editor) {
  if (!editor) return;

  const wrapper = safeGetWrapper(editor);
  if (!wrapper) {
    if (textSetupRetryCount < MAX_TEXT_SETUP_RETRIES) {
      textSetupRetryCount++;
      setTimeout(() => ensureAllTextEditable(editor), 200);
    } else {
      textSetupRetryCount = 0;
    }
    return;
  }

  try {
    textSetupRetryCount = 0;
    wrapper.components().forEach((root) => {
      walkComponents(root, configureAsTextComponent);
    });
  } catch (error) {
    console.warn('[TextSetup] Error:', error);
    if (textSetupRetryCount < MAX_TEXT_SETUP_RETRIES) {
      textSetupRetryCount++;
      setTimeout(() => ensureAllTextEditable(editor), 300);
    } else {
      textSetupRetryCount = 0;
    }
  }
}
