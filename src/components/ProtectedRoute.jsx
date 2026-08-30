import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../utils/authContext.jsx'
import { getDefaultRouteForRole } from '../utils/auth.js'
import { isOfflineAvailableRoute, useOffline } from '../utils/offlineMode.jsx'
import OfflineFallback from './OfflineFallback.jsx'

export default function ProtectedRoute({ children, roles = null, permission = null }) {
  const { authReady, currentUser, hasPermission } = useAuth()
  const { isOffline } = useOffline()
  const location = useLocation()

  // Offline Mode: Allow Calculator, Quotation, Invoice, Money Receipt without cloud auth barrier
  if (isOffline) {
    if (isOfflineAvailableRoute(location.pathname)) {
      return children
    }
    return <OfflineFallback />
  }

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-soft">
          Loading Business Suite...
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />
  }

  if (roles && !roles.includes(currentUser.role)) {
    return <Navigate replace to={getDefaultRouteForRole(currentUser.role)} />
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate replace to={getDefaultRouteForRole(currentUser.role)} />
  }

  return children
}
