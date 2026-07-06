import type { Component, Editor } from 'grapesjs';
import { safeGetWrapper } from './editorUtils';

const INLINE_TEXT_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'label', 'li', 'strong', 'em', 'small']);
const CONTAINER_TAGS = new Set(['section', 'header', 'footer', 'nav', 'main', 'article', 'form', 'ul', 'ol', 'table', 'tbody', 'thead', 'tr', 'td', 'th']);

const CONTENT_SET_OPTS = { fromDisable: 1 } as Record<string, unknown>;

export function isTextLikeTag(tag: string): boolean {
  return INLINE_TEXT_TAGS.has(tag.toLowerCase());
}

export function isTextLikeComponent(component: Component): boolean {
  return shouldConfigureAsText(component);
}

function hasComponentChildren(component: Component): boolean {
  return component.components().length > 0;
}

export function shouldConfigureAsText(component: Component): boolean {
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

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function setModelContent(component: Component, value: string) {
  component.set('content', value, CONTENT_SET_OPTS);
}

export function configureAsTextComponent(component: Component) {
  if (!shouldConfigureAsText(component)) return;

  const tag = (component.get('tagName') || '').toLowerCase();
  const type = component.get('type') || '';

  if (tag === 'a' || type === 'link') {
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

export function getTextContent(component: Component): string {
  const raw = component.get('content');
  if (typeof raw === 'string' && raw.trim()) {
    return stripHtml(raw);
  }
  const el = component.getEl?.();
  if (el) return (el.textContent || '').trim();
  return '';
}

export function setTextContent(component: Component, value: string, _editor?: Editor | null) {
  if (component.get('type') !== 'text' && shouldConfigureAsText(component)) {
    configureAsTextComponent(component);
  }
  setModelContent(component, value);
}

export function getLinkText(component: Component): string {
  return getTextContent(component);
}

export function setLinkText(component: Component, value: string, _editor?: Editor | null) {
  const tag = (component.get('tagName') || '').toLowerCase();
  const type = component.get('type') || '';

  if (tag !== 'a' && type !== 'link') {
    setTextContent(component, value, _editor);
    return;
  }

  const el = component.getEl?.();
  if (el) el.textContent = value;

  const children = component.components();
  if (children.length === 0) {
    setModelContent(component, value);
    return;
  }

  const first = children.at(0);
  if (first?.get('type') === 'textnode') {
    first.set('content', value);
    return;
  }

  children.reset();
  component.append(value);
}

export function walkComponents(component: Component, fn: (c: Component) => void) {
  fn(component);
  component.components().forEach((child: Component) => walkComponents(child, fn));
}

// ✅ Fixed: Add retry limit to prevent infinite loop
let textSetupRetryCount = 0;
const MAX_TEXT_SETUP_RETRIES = 5;

export function ensureAllTextEditable(editor: Editor) {
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
    wrapper.components().forEach((root: Component) => {
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