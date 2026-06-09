import { PREBUILT_TEMPLATES } from '../../constants/templates'

export async function listTemplates() {
  return PREBUILT_TEMPLATES
}

export async function getTemplate(id) {
  return PREBUILT_TEMPLATES.find((t) => t.id === id) || null
}

export async function saveUserTemplate(_template) {
  throw new Error('User template storage requires backend — not yet implemented')
}

export async function deleteUserTemplate(_id) {
  throw new Error('User template deletion requires backend — not yet implemented')
}
