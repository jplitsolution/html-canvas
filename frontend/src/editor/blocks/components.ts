import type { Editor } from 'grapesjs'
import { thumbnails } from './thumbnails'

function addBlock(
  editor: Editor,
  id: string,
  label: string,
  category: 'section' | 'component',
  thumb: keyof typeof thumbnails,
  content: string
) {
  editor.BlockManager.add(id, {
    label,
    category: category === 'section' ? 'Sections' : 'Components',
    media: thumbnails[thumb],
    content,
    select: true,
    activate: true,
    attributes: {
      class: category === 'section' ? 'tc-cat-section' : 'tc-cat-component',
      'data-block-id': id,
      title: `Drag ${label} to canvas`,
    },
  })
}

export function registerComponentBlocks(editor: Editor) {
  addBlock(
    editor,
    'text-block',
    'Text',
    'component',
    'text',
    `<p data-gjs-type="text" style="font-family:Inter,sans-serif;font-size:16px;color:#334155;line-height:1.6;margin:0;padding:16px;">Add your text here. Double-click to edit.</p>`
  )

  addBlock(
    editor,
    'button-block',
    'Button',
    'component',
    'button',
    `<a data-tc-type="button" href="#" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-family:Inter,sans-serif;font-size:15px;">Click me</a>`
  )

  addBlock(
    editor,
    'image-block',
    'Image',
    'component',
    'image',
    `<img data-tc-type="image" src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=500&fit=crop" alt="Placeholder image" style="width:100%;max-width:100%;height:auto;display:block;border-radius:8px;"/>`
  )

  addBlock(
    editor,
    'card-block',
    'Card',
    'component',
    'card',
    `<div style="padding:24px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;font-family:Inter,sans-serif;max-width:360px;">
      <h3 data-gjs-type="text" style="margin:0 0 8px;font-size:18px;font-weight:600;color:#0f172a;">Card title</h3>
      <p data-gjs-type="text" style="margin:0;color:#64748b;font-size:14px;line-height:1.6;">Card description goes here.</p>
    </div>`
  )

  addBlock(
    editor,
    'divider-block',
    'Divider',
    'component',
    'divider',
    `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>`
  )

  addBlock(
    editor,
    'hotspot-block',
    'Image Hotspot',
    'component',
    'button',
    `<a data-tc-type="hotspot" href="#" style="position:absolute;width:100px;height:100px;display:block;z-index:10;text-decoration:none;"></a>`
  )
}
