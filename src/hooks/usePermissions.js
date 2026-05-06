import { useStore } from '../store/useStore'

const ROLE_PERMISSIONS = {
  superadmin: ['*'],

  admin: [
    'view_dashboard',
    'view_products',    'manage_products',
    'view_stock',       'manage_stock',
    'view_purchases',   'manage_purchases',
    'view_sales',       'manage_sales',
    'view_deliveries',  'manage_deliveries',
    'view_drivers',     'manage_drivers',
    'view_reports',
    'view_users',       'manage_users',
    'view_settings',    'manage_settings',
    'view_financials',  // bénéfices, marges, prix achat
    'view_notifications',
  ],

  manager: [
    'view_dashboard',
    'view_products',    'manage_products',
    'view_stock',
    'view_purchases',   'manage_purchases',
    'view_sales',       'manage_sales',
    'view_deliveries',  'manage_deliveries',
    'view_drivers',
    'view_reports',
    'view_users',
    'view_financials',
    'view_notifications',
  ],

  caissier: [
    'view_dashboard',
    'view_products',
    'view_stock',
    'view_sales',       'manage_sales',
    'view_deliveries',  'manage_deliveries', // ← caissier peut ajouter livraison
    'view_notifications',
    // PAS view_financials
  ],

  vendeur: [
    'view_dashboard',
    'view_products',    // lecture seule — pas manage_products
    'view_stock',
    'view_sales',       'manage_sales',
    // PAS view_financials
  ],

  livreur: [
    'view_my_deliveries',  // uniquement SES livraisons
    'notify_delivery',     // peut notifier
  ],

  comptable: [
    'view_dashboard',
    'view_sales',          // lecture seule — pas manage_sales
    'view_purchases',      // lecture seule — pas manage_purchases
    'view_reports',
    'view_stock',
    'view_financials',
    // PAS manage_sales, PAS manage_purchases
  ],
}

export function usePermissions() {
  const { myRole, isSuperAdmin } = useStore()
  const role = isSuperAdmin ? 'superadmin' : (myRole || 'vendeur')

  const can = (permission) => {
    const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.vendeur
    if (perms.includes('*')) return true
    return perms.includes(permission)
  }

  const canAny = (...permissions) => permissions.some(p => can(p))
  const isRole = (r) => role === r

  return { role, can, canAny, isRole }
}