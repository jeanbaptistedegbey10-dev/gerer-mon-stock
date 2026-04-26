import { useStore } from '../store/useStore'

// ── Permissions par rôle ──────────────────────────────────────────────────────
const ROLE_PERMISSIONS = {
  superadmin: ['*'], // tout

  admin: [
    'view_dashboard',
    'view_products',   'manage_products',
    'view_stock',      'manage_stock',
    'view_purchases',  'manage_purchases',
    'view_sales',      'manage_sales',
    'view_deliveries', 'manage_deliveries',
    'view_drivers',    'manage_drivers',
    'view_reports',
    'view_users',      'manage_users',
    'view_settings',   'manage_settings',
  ],

  manager: [
    'view_dashboard',
    'view_products',   'manage_products',
    'view_stock',
    'view_purchases',  'manage_purchases',
    'view_sales',      'manage_sales',
    'view_deliveries', 'manage_deliveries',
    'view_drivers',
    'view_reports',
    'view_users',
  ],

  caissier: [
    'view_dashboard',
    'view_stock',
    'view_sales',      'manage_sales',
    'view_products',
  ],

  vendeur: [
    'view_dashboard',
    'view_stock',
    'view_products',
    'view_sales',      'manage_sales',
  ],

  livreur: [
    'view_dashboard',
    'view_deliveries', 'manage_deliveries',
  ],

  comptable: [
    'view_dashboard',
    'view_sales',
    'view_purchases',
    'view_reports',
    'view_stock',
  ],
}

export function usePermissions() {
  const { myRole, isSuperAdmin } = useStore()

  const role = isSuperAdmin ? 'superadmin' : (myRole || 'vendeur')

  const can = (permission) => {
    const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.vendeur
    // superadmin a tout
    if (perms.includes('*')) return true
    return perms.includes(permission)
  }

  const canAny = (...permissions) => permissions.some(p => can(p))

  return { role, can, canAny }
}