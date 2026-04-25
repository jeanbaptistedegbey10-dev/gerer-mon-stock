import { useStore } from '../store/useStore'
import { useTeam }  from './useTeam'

// ── Définition des permissions par rôle ──────────────────────────────────────
const PERMISSIONS = {
  admin: [
    'view_dashboard',
    'view_products',   'manage_products',
    'view_stock',
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
  ],
  employee: [
    'view_dashboard',
    'view_stock',
    'view_sales',      'manage_sales',
    'view_deliveries',
  ],
}

export function usePermissions() {
  const { user }   = useStore()
  const { members } = useTeam()

  // Trouver le rôle de l'utilisateur connecté
  // Si c'est le owner (pas dans team_members) → admin par défaut
  const currentMember = members.find(m => m.member_id === user?.id)
  const role = currentMember?.role || 'admin'

  const can = (permission) => {
    const perms = PERMISSIONS[role] || PERMISSIONS.employee
    return perms.includes(permission)
  }

  const canAny = (...permissions) => permissions.some(p => can(p))

  return { role, can, canAny, currentMember }
}