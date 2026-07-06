export function getVisitPagePath(visit) {
  if (visit?.pagePath?.length) return visit.pagePath
  return [visit?.pageType || 'HOME']
}

export function formatVisitPagePath(visit) {
  return getVisitPagePath(visit)
    .map((page) => `/${page}`)
    .join(' → ')
}
