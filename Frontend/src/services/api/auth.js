export async function getCurrentUser() {
  return null
}

export async function login(_credentials) {
  throw new Error('Authentication requires backend — not yet implemented')
}

export async function logout() {
  localStorage.removeItem('templatecraft_auth_token')
}

export async function register(_credentials) {
  throw new Error('Registration requires backend — not yet implemented')
}
