import type { Editor, Component } from 'grapesjs';

/**
 * Insert a section with background image, overlay, and editable text
 */
export function insertBackgroundWithText(editor: Editor, imageUrl: string): Component | null {
  const wrapper = editor.getWrapper();
  if (!wrapper) return null;

  const safeUrl = imageUrl.replace(/"/g, '&quot;');

  const html = `
    <section 
      data-tc-type="section" 
      data-background-image="${safeUrl}"
      style="
        background-image: url('${safeUrl}');
        background-size: cover;
        background-position: center;
        padding: 80px 32px;
        min-height: 420px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Inter, system-ui, sans-serif;
        overflow: hidden;
      "
    >
      <!-- Overlay Layer -->
      <div 
        data-overlay="true"
        style="
          position: absolute; 
          inset: 0; 
          background: rgba(0, 0, 0, 0.45);
          pointer-events: none;
          transition: opacity 0.2s ease;
        "
      ></div>
      
      <!-- Content Layer -->
      <div 
        style="
          position: relative; 
          z-index: 10; 
          color: #ffffff; 
          text-align: center; 
          max-width: 640px;
          padding: 20px;
          width: 100%;
        "
      >
        <h2 
          data-gjs-type="text" 
          style="
            font-size: 38px; 
            font-weight: 700; 
            margin: 0 0 12px 0;
            line-height: 1.2;
            text-shadow: 0 2px 8px rgba(0,0,0,0.3);
          "
        >
          Your heading here
        </h2>
        <p 
          data-gjs-type="text" 
          style="
            font-size: 18px; 
            opacity: 0.95; 
            margin: 0 0 28px 0;
            line-height: 1.6;
            text-shadow: 0 1px 4px rgba(0,0,0,0.2);
          "
        >
          Add your subtext or description here. Double-click to edit.
        </p>
        <a 
          data-tc-type="button" 
          href="#" 
          style="
            display: inline-block;
            background: #ffffff;
            color: #0f172a;
            padding: 12px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            transition: opacity 0.15s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          "
        >
          Get Started
        </a>
      </div>
    </section>
  `;

  wrapper.append(html);
  
  const components = wrapper.components();
  const last = components.at(components.length - 1);
  if (last) {
    editor.select(last);
    // Scroll to the new section
    setTimeout(() => {
      const el = last.getEl?.();
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
  
  return last || null;
}

/**
 * Update overlay opacity for a background section
 */
export function updateOverlayOpacity(component: Component, opacity: number): void {
  const overlay = component.find?.((c: Component) => 
    c.get('tagName') === 'div' && 
    c.getAttributes?.()?.['data-overlay'] === 'true'
  );
  
  if (overlay && overlay.length > 0) {
    overlay[0].setStyle({ opacity: String(opacity) });
  }
  
  // Also store as custom property for persistence
  component.setStyle({ '--overlay-opacity': String(opacity) });
}

/**
 * Get current overlay opacity from a background section
 */
export function getOverlayOpacity(component: Component): number {
  const style = component.getStyle() as Record<string, string>;
  const val = style['--overlay-opacity'] || '0.45';
  return parseFloat(val);
}