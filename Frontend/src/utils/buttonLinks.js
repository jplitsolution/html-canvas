export function getButtonLinks(content = {}) {
  if (Array.isArray(content.buttonLinks) && content.buttonLinks.length > 0) {
    return content.buttonLinks.map((item) => ({
      url: typeof item === 'string' ? item : (item?.url || '#'),
    }))
  }
  if (content.buttonLink) {
    return [{ url: content.buttonLink }]
  }
  return [{ url: '#' }]
}

export function normalizeButtonContent(content = {}) {
  const buttonLinks = getButtonLinks(content)
  const { buttonLink: _legacy, ...rest } = content
  return { ...rest, buttonLinks }
}

export function getButtonUrlList(content = {}) {
  return getButtonLinks(content).map((item) => item.url).filter(Boolean)
}

export function openButtonLinks(urls, event) {
  const list = (Array.isArray(urls) ? urls : []).filter(Boolean)
  if (!list.length) return

  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }

  if (list.length === 1) {
    window.location.assign(list[0])
    return
  }

  window.location.assign(list[0])
  list.slice(1).forEach((url) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  })
}

export function buildButtonClickScript(urls) {
  const list = urls.filter(Boolean)
  if (list.length <= 1) return ''
  const encoded = JSON.stringify(list)
  return `(function(e){e.preventDefault();var u=${encoded};window.location.assign(u[0]);u.slice(1).forEach(function(x){window.open(x,'_blank','noopener,noreferrer');});})(event)`
}
