function escapeCssUrl(url) {
  return String(url).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function appendBackgroundImageCss(styleRecord, backgroundImageUrl) {
  const url = (backgroundImageUrl || '').trim()
  if (!url) return styleRecord

  return {
    ...styleRecord,
    backgroundImage: `url("${escapeCssUrl(url)}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
}
