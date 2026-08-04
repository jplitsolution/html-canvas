import getConfig from '../config/configuration.js';

export const USER_STATUSES = ['active', 'inactive', 'suspended'];

export function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

export function getAdminEmail() {
  const config = getConfig();
  return normalizeEmail(config.adminEmail);
}

export function isAdminEmail(email) {
  const admin = getAdminEmail();
  if (!admin) return false;
  return normalizeEmail(email) === admin;
}

export function roleForEmail(email) {
  return isAdminEmail(email) ? 'admin' : 'user';
}

export function withRole(user) {
  if (!user) return user;
  const result = { ...user };
  delete result.password;
  result.role = roleForEmail(result.email);
  return result;
}

export function assertAdmin(request) {
  if (!isAdminEmail(request.user?.email)) {
    const err = new Error('Admin access required');
    err.statusCode = 403;
    throw err;
  }
}
