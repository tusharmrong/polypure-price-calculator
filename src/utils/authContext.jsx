import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  changeAuthUserPassword,
  createFirstAdminAccount,
  createAuthUser,
  deleteAuthUserProfile,
  getAuthSetupState,
  getDefaultRouteForRole,
  listSafeAuthUsers,
  loadAuthActivityLogs,
  loginWithCredentials,
  logoutCurrentUser,
  subscribeToAuthState,
  updateAuthUserProfile,
  updateAuthUserStatus
} from './auth.js'
import { syncLocalDocumentsToCloud } from './documents.js'
import { hasPermission as checkPermission, listPermissionsForRole } from './permissions.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [authReady, setAuthReady] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [users, setUsers] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const [authError, setAuthError] = useState('')
  const [needsFirstAdminSetup, setNeedsFirstAdminSetup] = useState(false)

  const refreshUsers = async (role = currentUser?.role) => {
    if (role !== 'admin') {
      setUsers([])
      return []
    }

    const nextUsers = await listSafeAuthUsers()
    setUsers(nextUsers)
    return nextUsers
  }

  const refreshActivityLogs = async (role = currentUser?.role) => {
    if (role !== 'admin') {
      setActivityLogs([])
      return []
    }

    const nextLogs = await loadAuthActivityLogs()
    setActivityLogs(nextLogs)
    return nextLogs
  }

  const refreshSetupState = async () => {
    const nextSetupState = await getAuthSetupState()
    setNeedsFirstAdminSetup(nextSetupState.needsFirstAdminSetup)
    return nextSetupState
  }

  const refreshAll = async (userOverride = currentUser) => {
    const nextRole = userOverride?.role || null
    await Promise.all([refreshUsers(nextRole), refreshActivityLogs(nextRole), refreshSetupState()])
    if (userOverride !== currentUser) {
      setCurrentUser(userOverride)
    }
    return userOverride
  }

  useEffect(() => {
    let isActive = true
    let unsubscribe = () => {}

    ;(async () => {
      try {
        await refreshSetupState()
        unsubscribe = subscribeToAuthState(async ({ user, error }) => {
          if (!isActive) return

          setCurrentUser(user)
          setAuthError(error || '')
          if (user) {
            try {
              await syncLocalDocumentsToCloud(user)
            } catch (syncError) {
              console.error('Unable to sync local document history to cloud on sign-in.', syncError)
            }
          }
          await refreshAll(user)
          setAuthReady(true)
        })
      } catch (error) {
        console.error('Unable to start cloud authentication.', error)
        if (!isActive) return
        setAuthError('Unable to start cloud authentication right now.')
        setAuthReady(true)
      }
    })()

    return () => {
      isActive = false
      unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      authReady,
      authError,
      currentUser,
      needsFirstAdminSetup,
      isAdmin: currentUser?.role === 'admin',
      isStaff: currentUser?.role === 'staff',
      users,
      activityLogs,
      permissions: listPermissionsForRole(currentUser?.role),
      hasPermission: (permission) => checkPermission(currentUser?.role, permission),
      login: async (username, password) => {
        const result = await loginWithCredentials(username, password)
        if (result.ok) {
          setCurrentUser(result.user)
          setAuthError('')
          await refreshAll(result.user)
        }
        return result
      },
      createFirstAdmin: async (payload) => {
        const result = await createFirstAdminAccount(payload)
        await refreshSetupState()
        return result
      },
      logout: async () => {
        await logoutCurrentUser()
        setCurrentUser(null)
        setUsers([])
        setActivityLogs([])
        await refreshSetupState()
      },
      createUser: async (payload) => {
        const result = await createAuthUser({
          ...payload,
          actorUserId: currentUser?.id || null
        })
        await refreshAll(currentUser)
        return result
      },
      setUserStatus: async (userId, status) => {
        const result = await updateAuthUserStatus(userId, status, currentUser?.id || null)
        await refreshAll(currentUser)
        return result
      },
      updateUserProfile: async (userId, updates) => {
        const result = await updateAuthUserProfile(userId, updates, currentUser?.id || null)
        await refreshAll(currentUser)
        return result
      },
      deleteUserProfile: async (userId) => {
        const result = await deleteAuthUserProfile(userId, currentUser?.id || null)
        await refreshAll(currentUser)
        return result
      },
      changeUserPassword: async (userId, password, confirmPassword) => {
        const result = await changeAuthUserPassword(
          userId,
          password,
          confirmPassword,
          currentUser?.id || null
        )
        await refreshAll(currentUser)
        return result
      },
      getDefaultRoute: (role = currentUser?.role) => getDefaultRouteForRole(role),
      refreshAuthState: refreshAll
    }),
    [activityLogs, authError, authReady, currentUser, needsFirstAdminSetup, users]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  return (
    context || {
      authReady: true,
      authError: '',
      currentUser: null,
      needsFirstAdminSetup: false,
      isAdmin: false,
      isStaff: false,
      users: [],
      activityLogs: [],
      permissions: [],
      hasPermission: () => false,
      login: async () => ({ ok: false, error: 'Auth unavailable.' }),
      createFirstAdmin: async () => ({ ok: false, error: 'Auth unavailable.' }),
      logout: async () => {},
      createUser: async () => ({ ok: false, error: 'Auth unavailable.' }),
      setUserStatus: async () => ({ ok: false, error: 'Auth unavailable.' }),
      updateUserProfile: async () => ({ ok: false, error: 'Auth unavailable.' }),
      deleteUserProfile: async () => ({ ok: false, error: 'Auth unavailable.' }),
      changeUserPassword: async () => ({ ok: false, error: 'Auth unavailable.' }),
      getDefaultRoute: () => '/login',
      refreshAuthState: async () => null
    }
  )
}
