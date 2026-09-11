# Canvas Changes & Enhancement Documentation

Yeh document HTML Canvas / GrapesJS Editor mai kiye gaye sabhi changes, bug fixes aur improvements ka complete record hai. Saath hi ismai **Ready-to-Use Prompts** bhi shamil hain jise aap kisi bhi AI ya team member ko dene ke liye directly copy-paste kar sakte hain.

---

## 1. Overview: Canvas Mai Kya-Kya Badlav Hue Hain?

Canvas editor ko zyada stable, predictable aur user-friendly banane ke liye core layout engine, drag-drop system, z-index stacking, aur text editing mai major enhancements kiye gaye:

1. **Smart Drag & Drop with Iframe Zoom & Hit-testing**:
   - Iframe zoom ke hisaab se cursor coordinates (`clientX`, `clientY`) ka scale calculation.
   - `elementsFromPoint` se detect kiya jata hai ki user ne element kisi Image/Banner ke upar drop kiya hai ya general container mai.
   - Container ke andar drop karne par closest sibling ke Y-midpoint ko calculate karke item ko right position par insert kiya jata hai (bottom mai push hone ki problem fix hui).

2. **Overlay Stacking & Z-Index Management**:
   - Explicit stacking hierarchy establish ki gayi:
     - Background / Image: `z-index: 1`
     - Regular In-Flow Elements: `z-index: 10`
     - Absolute Overlays / CTAs on Image: `z-index: 40`
     - Clickable Hotspots: `z-index: 50`
   - Image ke parent ko automatically `position: relative` banaya gaya taaki overlays image boundary ke respect mai align ho, pure canvas par break na ho.

3. **Universal Component Wrapper Resolver (`getComp`)**:
   - GrapesJS events ya models se milne wale component objects alag-alag structures mai hote hain (`e.target`, `e.model`, `e.component`, direct component).
   - Naya helper `getComp()` add kiya gaya jo safely true component extract karta hai, jisse `component.get is not a function` ya crash hone ke runtime errors completely solve ho gaye.

4. **Text Content Extraction & Editing Fix**:
   - GrapesJS nested text blocks mai text gayab hone ya blank dikhne ki issue ko fix kiya gaya.
   - Text parsing logic ko upgrade kiya gaya: Pehle model content check hota hai, agar empty ho toh child `textnode` components ko concatenate karke extract karta hai, fir DOM fallback, aur end mai default `'Add text'` set hota hai.
   - Sidebar Property Panel aur canvas dono par text live sync hota hai.

5. **Button & Block Resizing Logic**:
   - Flow buttons (form/card ke andar ke CTAs) natural DOM flow mai rehte hain aur unko vertical handles diye gaye hain.
   - Overlay buttons aur Hotspots ko pixel-based absolute freeform resize handles diye gaye hain.
   - Block containers (sections, columns) ko corner + edge handles diye gaye hain taaki content flow break na ho.

6. **Contextual Format Bar & Canvas Controls**:
   - Canvas par selected text/element ke thik upar floating format bar introduce kiya gaya (Bold, Italic, Font Size, Color, Alignment, Layers, Delete).
   - Device switcher (Desktop / Tablet / Mobile) with custom viewport meta injection.
   - Zoom in/out, fit to screen, undo/redo, aur preview mode integration.

---

## 2. File-Wise Changes Breakdown

| File Path | Changes Description |
| :--- | :--- |
| `frontend/src/editor/utils/editorUtils.js` | `getComp()` helper function introduce kiya gaya jo kisi bhi wrapper object, event target ya model se safely GrapesJS component instance extract karta hai. |
| `frontend/src/editor/utils/overlayStacking.js` | `getComp()` integrate kiya gaya, tag-name safe lowercase checks, `dropPointHitsImage` hit-testing, parent `position: relative` assurance, aur Z-index (`Z_IMAGE=1`, `Z_OVERLAY=40`, `Z_HOTSPOT=50`) enforce kiya gaya. |
| `frontend/src/editor/utils/textSizeAlign.js` | `getComp()` integration, flow buttons vs overlay buttons ka differentiation, container block resize configurations, aur safe flex/line-height alignment rules. |
| `frontend/src/editor/utils/textContent.js` | Text extraction logic improve ki gayi; child textnodes iterate karke content join karta hai, fallback DOM parsing, aur DOM text synchronization (`syncComponentDomText`). |
| `frontend/src/editor/blocks/components.js` | Default text component ka placeholder snippet `'Add text'` par normalize kiya gaya. |
| `frontend/src/editor/shell/PropertyPanel.jsx` | Textarea ke liye placeholder add kiya gaya aur safe `getTextContent` / `setTextContent` binding ensure ki gayi. |
| `frontend/src/editor/TemplateEditor.jsx` | Canvas frame drag tracking, iframe zoom offset normalization, `elementsFromPoint` image detection, targeted vertical drop-index calculation, aur drag end event handling. |
| `frontend/src/editor/shell/ContextualFormatBar.jsx` | Canvas floating toolbar jo selected element ke saath move hota hai aur quick formatting options provide karta hai. |
| `frontend/src/editor/plugins/canvasEnhancements.js` | Responsive device viewport overrides, mobile hamburger styling, canvas guidelines, snap-to-grid, aur dynamic style injection. |
| `frontend/src/editor/plugins/textEditing.js` | RTE (Rich Text Editor) inline editing stabilization, double-click activation, aur caret offset sanitization. |

---

## 3. Ready-to-Use Prompts (Aap Inhe Directly Copy Kar Sakte Hain)

Aapko aage kisi doosre AI model ya prompt-based workflow mai use karna ho, toh niche do alag formats mai prompt tayar hain:

### Prompt Option 1: Detailed Technical Spec Prompt (English)
Use this prompt if you want to explain the full architecture and technical changes to an AI developer or LLM:

```text
You are an expert web application and canvas editor engineer working on a GrapesJS-based template builder.
Here is the complete specification of the recent canvas enhancements, bug fixes, and architectural rules applied to the editor:

1. COMPONENT RESOLUTION & STABILITY:
   - Implemented a universal `getComp(component)` utility in `editorUtils.js`. It safely unwraps component references from raw objects, event payloads (`e.target`, `e.model`, `e.component`), and direct models to prevent "component.get is not a function" crashes.
   - All helper functions across `overlayStacking.js`, `textSizeAlign.js`, and `TemplateEditor.jsx` use `getComp()` and perform case-insensitive tag evaluation.

2. DRAG & DROP WITH ACCURATE SPATIAL COORDINATES:
   - The canvas frame lives inside an iframe with dynamic zoom. During drag events (`mousemove`, `pointermove`, `canvas:dragover`), coordinates are transformed using the iframe's bounding rectangle and current zoom factor: `iframeX = (clientX - frameRect.left) / zoom`.
   - Hit testing uses `frameDoc.elementsFromPoint(iframeX, iframeY)` to determine whether the drop target is an image, banner, or nested child.
   - When dropped onto an image, the element is converted to an absolute overlay with percentage coordinates (`topPct%`, `leftPct%`) and assigned `z-index: 40`. The parent container is set to `position: relative`.
   - When dropped inside a container with multiple siblings, the editor computes the closest sibling's vertical midpoint (`childMidY`) and inserts the new component at that specific index rather than appending to the bottom.

3. STACKING ORDER & OVERLAY RULES:
   - Standardized Z-index constants: `Z_IMAGE = 1`, `Z_IN_FLOW = 10`, `Z_OVERLAY = 40`, `Z_HOTSPOT = 50`.
   - In-card CTA buttons remain in natural document flow (`position: relative`) with vertical resizing only.
   - Hotspots and image overlays retain pixel/percentage bounding boxes and remain above all media layers.

4. ROBUST TEXT COMPONENT RECOVERY & EDITING:
   - Resolved blank/lost text in nested text components: `configureAsTextComponent` now checks model content, recurses through child `textnode` models to concatenate strings, falls back to DOM `textContent`, and defaults to 'Add text'.
   - Synchronizes model content directly to DOM via `syncComponentDomText` and links bidirectional editing with the sidebar Property Panel.

5. CANVAS UI & CONTEXTUAL TOOLBAR:
   - Added a floating `ContextualFormatBar` over the canvas selection for quick typography, color, layering, and deletion controls.
   - Added canvas toolbar controls for responsive viewport toggling (Mobile 375px, Tablet 768px, Desktop 100%), zoom in/out/fit, and clean RTE lifecycle management.

Maintain these architectural guidelines and patterns across all future canvas editor modifications.
```

---

### Prompt Option 2: Conversational / Summary Prompt (Hinglish)
Use this prompt if you want to explain the changes in natural Hinglish:

```text
Canvas editor mai humne recent updates aur bug fixes implement kiye hain jinki summary yeh hai:

1. Drag-and-Drop & Accurate Drop Placement:
   - Canvas iframe zoom level ko calculate karke mouse drop coordinates ko accurately map kiya gaya hai.
   - `elementsFromPoint` se pata lagaya jata hai ki drop image ke upar hua hai ya normal container mai.
   - Agar image pe drop hua, toh wo automatically absolute overlay ban jata hai (`z-index: 40`) aur parent container `position: relative` ho jata hai taaki overlay bhatke nahi.
   - Normal section/cards mai drop hone par closest sibling ka Y position check karke sahi order (index) par element insert hota hai, ab elements seedhe bottom mai nahi jate.

2. Component Crash Protection (`getComp` helper):
   - GrapesJS ke events aur wrapper objects se direct `.get()` call karne par aane wale crashes ko solve karne ke liye `getComp()` banaya gaya. Har function safely component nikalta hai.

3. Z-Index aur Layer Stacking Fix:
   - Images ko `z-index: 1`, regular content ko `z-index: 10`, overlays ko `z-index: 40` aur clickable hotspots ko `z-index: 50` diya gaya hai taaki koi button ya text image ke piche na chupe.
   - Card ke andar wale buttons document flow mai hi rehte hain, sirf banner ke upar wale buttons overlay bante hain.

4. Text Component & Editing Fixes:
   - Text gayab ya blank hone ki dikkat solve ki gayi hai. Ab nested textnodes, model content aur DOM text ka proper fallback check hota hai aur default 'Add text' rehta hai.
   - Property panel aur canvas dono live sync hote hain.

5. UI & Formatting:
   - Canvas par floating Contextual Format Bar add kiya gaya hai jisse direct canvas se bold, italic, color, font-size aur alignment change ki ja sakti hai.
   - Responsive device switch (Mobile, Tablet, Desktop) aur Canvas Zoom controls integrate kiye gaye hain.
```

---

## 4. Current Status of Codebase

- **Branch**: `canva-fix`
- **Core Files Updated**: `TemplateEditor.jsx`, `overlayStacking.js`, `textSizeAlign.js`, `textContent.js`, `editorUtils.js`, `components.js`, `PropertyPanel.jsx`.
- **Testing & Verification**: Unit tests for canvas drag priority and canvas height floor are aligned with the new geometry and stacking rules.
