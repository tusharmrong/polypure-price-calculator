export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  USE_CALCULATOR: 'use_calculator',
  MANAGE_QUOTATIONS: 'manage_quotations',
  MANAGE_INVOICES: 'manage_invoices',
  MANAGE_RECEIPTS: 'manage_receipts',
  VIEW_CLIENTS: 'view_clients',
  VIEW_USERS: 'view_users',
  MANAGE_USERS: 'manage_users',
  VIEW_HISTORY: 'view_history',
  MANAGE_SETTINGS: 'manage_settings'
}

export const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS),
  staff: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.USE_CALCULATOR,
    PERMISSIONS.MANAGE_QUOTATIONS,
    PERMISSIONS.MANAGE_INVOICES,
    PERMISSIONS.MANAGE_RECEIPTS
  ]
}

export function listPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || []
}

export function hasPermission(role, permission) {
  if (!permission) return true
  return listPermissionsForRole(role).includes(permission)
}
