export function buildImageHtml(src: string, alt = 'Image') {
  const safeSrc = src.replace(/"/g, '&quot;')
  const safeAlt = alt.replace(/"/g, '&quot;')
  return `<img data-tc-type="image" src="${safeSrc}" alt="${safeAlt}" style="width:100%;max-width:100%;height:auto;display:block;border-radius:8px;"/>`
}
