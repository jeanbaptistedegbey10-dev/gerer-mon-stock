import { usePermissions } from '../hooks/usePermissions'

// ── Composant qui cache/affiche selon la permission ───────────────────────────
export default function PermissionGate({
  permission,
  fallback = null,
  children
}) {
  const { can } = usePermissions()

  if (!can(permission)) return fallback
  return children
}