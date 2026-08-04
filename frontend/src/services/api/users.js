import { apiClient } from './client'

export async function listUsers() {
  return apiClient('/users/admin')
}

export async function createUser(data) {
  return apiClient('/users/admin', {
    method: 'POST',
    body: data,
  })
}

export async function updateUser(id, data) {
  return apiClient(`/users/admin/${id}`, {
    method: 'PATCH',
    body: data,
  })
}

export async function setUserStatus(id, status) {
  return apiClient(`/users/admin/${id}/status`, {
    method: 'PATCH',
    body: { status },
  })
}

export async function setUserPassword(id, password) {
  return apiClient(`/users/admin/${id}/password`, {
    method: 'PATCH',
    body: { password },
  })
}
