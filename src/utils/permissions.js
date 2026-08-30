export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  USE_CALCULATOR: 'use_calculator',
  MANAGE_QUOTATIONS: 'manage_quotations',
  MANAGE_INVOICES: 'manage_invoices',
  MANAGE_RECEIPTS: 'manage_receipts',
  VIEW_CLIENTS: 'view_clients',
  MANAGE_CLIENTS: 'manage_clients',
  VIEW_USERS: 'view_users',
  MANAGE_USERS: 'manage_users',
  VIEW_HISTORY: 'view_history',
  VIEW_REPORTS: 'view_reports',
  MANAGE_EXPENSES: 'manage_expenses',
  DELETE_DOCUMENTS: 'delete_documents',
  EXPORT_DATA: 'export_data',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_FACTORY_COST: 'manage_factory_cost',
  VIEW_PRODUCTION: 'view_production',
  MANAGE_PRODUCTION: 'manage_production'
}

export const PERMISSION_GROUPS = {
  CORE: 'Core Operations',
  DOCUMENTS: 'Sales & Billing',
  PRODUCTION: 'Factory & Production',
  CLIENTS: 'Clients & Directory',
  REPORTS: 'Profit & Loss / Reports',
  ADMIN: 'Administration & Security',
  SYSTEM: 'System & Reports'
}

export const PERMISSION_DETAILS = [
  {
    key: PERMISSIONS.VIEW_DASHBOARD,
    label: 'View Dashboard',
    description: 'Access the overview metrics, quick summaries, and dashboard stats.',
    group: PERMISSION_GROUPS.CORE
  },
  {
    key: PERMISSIONS.USE_CALCULATOR,
    label: 'Use Price Calculator',
    description: 'Use the bag and roll price estimators and production calculator.',
    group: PERMISSION_GROUPS.CORE
  },
  {
    key: PERMISSIONS.MANAGE_QUOTATIONS,
    label: 'Manage Quotations',
    description: 'Create, edit, preview, and save price quotations.',
    group: PERMISSION_GROUPS.DOCUMENTS
  },
  {
    key: PERMISSIONS.MANAGE_INVOICES,
    label: 'Manage Invoices',
    description: 'Generate, edit, and print commercial invoices.',
    group: PERMISSION_GROUPS.DOCUMENTS
  },
  {
    key: PERMISSIONS.MANAGE_RECEIPTS,
    label: 'Manage Money Receipts',
    description: 'Create, edit, and print payment money receipts.',
    group: PERMISSION_GROUPS.DOCUMENTS
  },
  {
    key: PERMISSIONS.VIEW_CLIENTS,
    label: 'View Clients',
    description: 'Browse client directory, contact list, and customer history.',
    group: PERMISSION_GROUPS.CLIENTS
  },
  {
    key: PERMISSIONS.MANAGE_CLIENTS,
    label: 'Edit & Add Clients',
    description: 'Create new client records and update existing customer profiles.',
    group: PERMISSION_GROUPS.CLIENTS
  },
  {
    key: PERMISSIONS.VIEW_REPORTS,
    label: 'View Profit & Loss / Due Reports',
    description: 'Access business profit/loss statements, cash flow, and client due lists.',
    group: PERMISSION_GROUPS.REPORTS
  },
  {
    key: PERMISSIONS.MANAGE_EXPENSES,
    label: 'Manage Expenses',
    description: 'Record, edit, and categorize company operational and material expenses.',
    group: PERMISSION_GROUPS.REPORTS
  },
  {
    key: PERMISSIONS.VIEW_HISTORY,
    label: 'View Document History',
    description: 'Browse past quotations, invoices, and receipt archives.',
    group: PERMISSION_GROUPS.SYSTEM
  },
  {
    key: PERMISSIONS.DELETE_DOCUMENTS,
    label: 'Delete Documents',
    description: 'Permanently remove saved invoices, quotations, and receipts.',
    group: PERMISSION_GROUPS.SYSTEM
  },
  {
    key: PERMISSIONS.EXPORT_DATA,
    label: 'Export Data & Backups',
    description: 'Download JSON backups, client data, and document exports.',
    group: PERMISSION_GROUPS.SYSTEM
  },
  {
    key: PERMISSIONS.VIEW_USERS,
    label: 'View User Accounts',
    description: 'View the list of registered users and access activity logs.',
    group: PERMISSION_GROUPS.ADMIN
  },
  {
    key: PERMISSIONS.MANAGE_USERS,
    label: 'Manage Users & Reset Passwords',
    description: 'Create staff accounts, edit user roles, freeze accounts, and reset passwords.',
    group: PERMISSION_GROUPS.ADMIN
  },
  {
    key: PERMISSIONS.MANAGE_SETTINGS,
    label: 'Manage Company Settings',
    description: 'Edit company profile, terms, logo, signature, and system configurations.',
    group: PERMISSION_GROUPS.ADMIN
  },
  {
    key: PERMISSIONS.MANAGE_FACTORY_COST,
    label: 'Manage Factory Costing',
    description: 'Calculate and record raw material, printing, handle, and custom factory costs and order profit margins.',
    group: PERMISSION_GROUPS.ADMIN
  },
  {
    key: PERMISSIONS.VIEW_PRODUCTION,
    label: 'View Production Board',
    description: 'Access the factory production pipeline board and order statuses.',
    group: PERMISSION_GROUPS.PRODUCTION
  },
  {
    key: PERMISSIONS.MANAGE_PRODUCTION,
    label: 'Manage Production & Print Job Cards',
    description: 'Advance manufacturing stages, print factory job cards and delivery challans.',
    group: PERMISSION_GROUPS.PRODUCTION
  }
]

export const ROLE_PRESETS = {
  admin: {
    id: 'admin',
    name: 'Administrator',
    description: 'Full system access to all modules, settings, and user management.',
    permissions: Object.values(PERMISSIONS)
  },
  staff_full: {
    id: 'staff_full',
    name: 'Standard Staff',
    description: 'Standard daily business operations: calculator, quotes, invoices, receipts, production, and clients.',
    permissions: [
      PERMISSIONS.VIEW_DASHBOARD,
      PERMISSIONS.USE_CALCULATOR,
      PERMISSIONS.MANAGE_QUOTATIONS,
      PERMISSIONS.MANAGE_INVOICES,
      PERMISSIONS.MANAGE_RECEIPTS,
      PERMISSIONS.VIEW_PRODUCTION,
      PERMISSIONS.MANAGE_PRODUCTION,
      PERMISSIONS.VIEW_CLIENTS,
      PERMISSIONS.MANAGE_CLIENTS,
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.VIEW_HISTORY
    ]
  },
  sales: {
    id: 'sales',
    name: 'Sales Executive',
    description: 'Focused on pricing, price calculations, creating quotations, invoices, and tracking production.',
    permissions: [
      PERMISSIONS.VIEW_DASHBOARD,
      PERMISSIONS.USE_CALCULATOR,
      PERMISSIONS.MANAGE_QUOTATIONS,
      PERMISSIONS.MANAGE_INVOICES,
      PERMISSIONS.VIEW_PRODUCTION,
      PERMISSIONS.VIEW_CLIENTS
    ]
  },
  accounts: {
    id: 'accounts',
    name: 'Accounts & Billing',
    description: 'Focused on invoices, money receipts, client balances, P&L reports, and document history.',
    permissions: [
      PERMISSIONS.VIEW_DASHBOARD,
      PERMISSIONS.MANAGE_INVOICES,
      PERMISSIONS.MANAGE_RECEIPTS,
      PERMISSIONS.VIEW_CLIENTS,
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.MANAGE_EXPENSES,
      PERMISSIONS.VIEW_HISTORY
    ]
  },
  viewer: {
    id: 'viewer',
    name: 'Auditor / Viewer',
    description: 'Read-only access to dashboard, clients, and document archives.',
    permissions: [
      PERMISSIONS.VIEW_DASHBOARD,
      PERMISSIONS.VIEW_CLIENTS,
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.VIEW_HISTORY
    ]
  }
}

export const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS),
  staff: ROLE_PRESETS.staff_full.permissions
}

export function listPermissionsForRole(role, customPermissions = null) {
  if (role === 'admin') {
    return Object.values(PERMISSIONS)
  }
  if (Array.isArray(customPermissions) && customPermissions.length > 0) {
    return customPermissions
  }
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.staff
}

export function getUserPermissions(user) {
  if (!user) return []
  if (user.role === 'admin') {
    return Object.values(PERMISSIONS)
  }
  if (Array.isArray(user.customPermissions) && user.customPermissions.length > 0) {
    return user.customPermissions
  }
  return ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.staff
}

export function hasPermission(roleOrUser, permission) {
  if (!permission) return true
  if (!roleOrUser) return false

  if (typeof roleOrUser === 'object') {
    const userPermissions = getUserPermissions(roleOrUser)
    return userPermissions.includes(permission)
  }

  return listPermissionsForRole(roleOrUser).includes(permission)
}
