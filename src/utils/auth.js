import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { firebaseAuth, firebaseDb, firebaseInitError } from './firebase.js'
import { firebaseConfig } from './firebaseConfig.js'

const usersCollection = firebaseDb ? collection(firebaseDb, 'users') : null
const activityLogsCollection = firebaseDb ? collection(firebaseDb, 'activityLogs') : null
const bootstrapDoc = firebaseDb ? doc(firebaseDb, 'meta', 'bootstrap') : null

export const PASSWORD_RULES = [
  'At least 8 characters',
  'One uppercase letter',
  'One lowercase letter',
  'One number',
  'One special character'
]

function trimUserInput(value) {
  return String(value || '').trim()
}

function normalizeUsername(username) {
  return trimUserInput(username).toLowerCase()
}

function createSyntheticEmail(username) {
  return `${normalizeUsername(username)}@polypure-bsuite.local`
}

function sanitizeUser(user) {
  if (!user) return null
  const { password, ...safeUser } = user
  return safeUser
}

function getSafeRole(role) {
  return role === 'admin' ? 'admin' : 'staff'
}

function getSafeStatus(status) {
  return status === 'frozen' ? 'frozen' : 'active'
}

function sortLogs(logs) {
  return [...logs].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
}

function getCloudUnavailableResult() {
  return {
    ok: false,
    error: 'Cloud login is not ready right now. Please refresh once and try again.'
  }
}

function ensureCloudReady() {
  return Boolean(firebaseAuth && firebaseDb && usersCollection && activityLogsCollection && !firebaseInitError)
}

async function readAuthBootstrapState() {
  if (!ensureCloudReady() || !bootstrapDoc) return null
  const snapshot = await getDoc(bootstrapDoc)
  return snapshot.exists() ? snapshot.data() : null
}

async function writeAuthBootstrapState(nextState = {}) {
  if (!ensureCloudReady() || !bootstrapDoc) return null

  const now = new Date().toISOString()
  const previousState = (await readAuthBootstrapState()) || {}
  const nextValue = {
    firstAdminSetupComplete:
      typeof nextState.firstAdminSetupComplete === 'boolean'
        ? nextState.firstAdminSetupComplete
        : Boolean(previousState.firstAdminSetupComplete),
    hasUsers:
      typeof nextState.hasUsers === 'boolean' ? nextState.hasUsers : Boolean(previousState.hasUsers),
    hasAdmin:
      typeof nextState.hasAdmin === 'boolean' ? nextState.hasAdmin : Boolean(previousState.hasAdmin),
    firstAdminUserId: trimUserInput(nextState.firstAdminUserId || previousState.firstAdminUserId || ''),
    firstAdminUsername: normalizeUsername(nextState.firstAdminUsername || previousState.firstAdminUsername || ''),
    firstAdminName: trimUserInput(nextState.firstAdminName || previousState.firstAdminName || ''),
    source: trimUserInput(nextState.source || previousState.source || 'auth'),
    initializedAt: previousState.initializedAt || now,
    updatedAt: now
  }

  await setDoc(bootstrapDoc, nextValue, { merge: true })
  return nextValue
}

async function ensureAuthBootstrapState(actorUser = null) {
  if (!ensureCloudReady()) return null

  const bootstrapState = await readAuthBootstrapState()

  if (!actorUser?.id && bootstrapState?.firstAdminSetupComplete) {
    return {
      hasUsers: true,
      hasAdmin: true,
      needsFirstAdminSetup: false
    }
  }

  if (!actorUser?.id && !bootstrapState?.firstAdminSetupComplete) {
    return {
      hasUsers: false,
      hasAdmin: false,
      needsFirstAdminSetup: true
    }
  }

  const [userSnapshot, adminSnapshot] = await Promise.all([
    getDocs(query(usersCollection, limit(1))),
    getDocs(query(usersCollection, where('role', '==', 'admin'), limit(1)))
  ])

  if (bootstrapState?.firstAdminSetupComplete) {
    if (adminSnapshot.empty) {
      return {
        hasUsers: !userSnapshot.empty,
        hasAdmin: false,
        needsFirstAdminSetup: true
      }
    }

    if (!adminSnapshot.empty) {
      const firstAdmin = sanitizeUser({
        id: adminSnapshot.docs[0].id,
        ...adminSnapshot.docs[0].data()
      })

      await writeAuthBootstrapState({
        firstAdminSetupComplete: true,
        hasUsers: !userSnapshot.empty,
        hasAdmin: true,
        firstAdminUserId: firstAdmin?.id || '',
        firstAdminUsername: firstAdmin?.username || '',
        firstAdminName: firstAdmin?.name || '',
        source: 'bootstrap-confirmed'
      })
    }

    return {
      hasUsers: !userSnapshot.empty,
      hasAdmin: !adminSnapshot.empty,
      needsFirstAdminSetup: false
    }
  }

  if (adminSnapshot.empty) {
    return {
      hasUsers: !userSnapshot.empty,
      hasAdmin: false,
      needsFirstAdminSetup: true
    }
  }

  const firstAdmin = sanitizeUser({
    id: adminSnapshot.docs[0].id,
    ...adminSnapshot.docs[0].data()
  })

  await writeAuthBootstrapState({
    firstAdminSetupComplete: true,
    hasUsers: !userSnapshot.empty,
    hasAdmin: true,
    firstAdminUserId: firstAdmin?.id || '',
    firstAdminUsername: firstAdmin?.username || '',
    firstAdminName: firstAdmin?.name || '',
    source: actorUser?.id ? `recovered-by:${actorUser.id}` : 'recovered-from-users'
  })

  return {
    hasUsers: !userSnapshot.empty,
    hasAdmin: true,
    needsFirstAdminSetup: false
  }
}

function mapAuthError(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'INVALID_LOGIN_CREDENTIALS':
    case 'EMAIL_NOT_FOUND':
    case 'INVALID_PASSWORD':
      return 'Invalid username or password.'
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait a moment and try again.'
    case 'auth/network-request-failed':
      return 'Unable to reach the cloud login service right now. Please check your connection.'
    case 'EMAIL_EXISTS':
      return 'This username is already in use.'
    default:
      return 'Something went wrong while talking to the login service.'
  }
}

async function callIdentityToolkit(endpoint, payload) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${firebaseConfig.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  )

  const data = await response.json()
  if (!response.ok) {
    const errorCode = data?.error?.message || 'UNKNOWN'
    return {
      ok: false,
      code: errorCode,
      error: mapAuthError(errorCode)
    }
  }

  return { ok: true, data }
}

async function createFirebaseAuthAccount({ email, password }) {
  const result = await callIdentityToolkit('accounts:signUp', {
    email,
    password,
    returnSecureToken: false
  })

  if (!result.ok) return result

  return {
    ok: true,
    uid: result.data.localId,
    email: result.data.email
  }
}

async function lookupFirebaseAuthAccount({ email, password }) {
  const result = await callIdentityToolkit('accounts:signInWithPassword', {
    email,
    password,
    returnSecureToken: true
  })

  if (!result.ok) return result

  return {
    ok: true,
    uid: result.data.localId,
    email: result.data.email
  }
}

async function getUserProfileById(userId) {
  if (!ensureCloudReady()) return null
  const snapshot = await getDoc(doc(firebaseDb, 'users', userId))
  if (!snapshot.exists()) return null
  return sanitizeUser({
    id: snapshot.id,
    ...snapshot.data()
  })
}

async function getUserProfileByUsername(username) {
  if (!ensureCloudReady()) return null
  const result = await getDocs(query(usersCollection, where('username', '==', normalizeUsername(username)), limit(1)))
  const found = result.docs[0]
  if (!found) return null
  return sanitizeUser({
    id: found.id,
    ...found.data()
  })
}

export async function getAuthSetupState() {
  if (!ensureCloudReady()) {
    return {
      hasUsers: false,
      hasAdmin: false,
      needsFirstAdminSetup: true
    }
  }

  return ensureAuthBootstrapState()
}

export function validatePassword(password) {
  const cleanPassword = String(password || '')
  const checks = [
    { label: PASSWORD_RULES[0], ok: cleanPassword.length >= 8 },
    { label: PASSWORD_RULES[1], ok: /[A-Z]/.test(cleanPassword) },
    { label: PASSWORD_RULES[2], ok: /[a-z]/.test(cleanPassword) },
    { label: PASSWORD_RULES[3], ok: /\d/.test(cleanPassword) },
    { label: PASSWORD_RULES[4], ok: /[^A-Za-z0-9]/.test(cleanPassword) }
  ]

  return {
    ok: checks.every((check) => check.ok),
    checks
  }
}

function canLastActiveAdminBeChanged(users, targetUser, nextRole, nextStatus) {
  if (!targetUser) return true
  const isAdminNow = targetUser.role === 'admin'
  const staysActiveAdmin = nextRole === 'admin' && nextStatus === 'active'
  if (!isAdminNow || staysActiveAdmin) return true

  const activeAdmins = users.filter((user) => user.role === 'admin' && user.status === 'active')
  return activeAdmins.length > 1
}

export async function recordAuthActivity({
  action,
  actorUserId = '',
  actorName = 'System',
  targetUserId = '',
  targetName = '',
  description = ''
}) {
  if (!ensureCloudReady()) return null
  const nextLog = {
    id: `auth-log-${Date.now()}`,
    action,
    actorUserId,
    actorName,
    targetUserId,
    targetName,
    description,
    createdAt: new Date().toISOString()
  }

  try {
    await setDoc(doc(activityLogsCollection, nextLog.id), nextLog)
    return nextLog
  } catch (error) {
    console.warn('Auth activity log was not saved.', error)
    return null
  }
}

export async function listSafeAuthUsers() {
  if (!ensureCloudReady()) return []
  const snapshot = await getDocs(usersCollection)
  return snapshot.docs
    .map((user) => sanitizeUser({ id: user.id, ...user.data() }))
    .sort((left, right) => {
      if (left.role !== right.role) return left.role === 'admin' ? -1 : 1
      return left.name.localeCompare(right.name)
    })
}

export async function loadAuthActivityLogs() {
  if (!ensureCloudReady()) return []
  const snapshot = await getDocs(activityLogsCollection)
  const logs = snapshot.docs.map((item) => item.data())
  return sortLogs(logs).slice(0, 200)
}

export function getDefaultRouteForRole(role) {
  return role === 'admin' ? '/' : '/calculator'
}

export function subscribeToAuthState(callback) {
  if (!ensureCloudReady()) {
    callback({
      user: null,
      error: firebaseInitError
        ? 'Cloud login could not start correctly. Please refresh once and try again.'
        : ''
    })
    return () => {}
  }

  return onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback({ user: null, error: '' })
      return
    }

    try {
      const profile = await getUserProfileById(firebaseUser.uid)

      if (!profile) {
        await signOut(firebaseAuth)
        callback({
          user: null,
          error: 'This account is not fully prepared yet. Please contact admin.'
        })
        return
      }

      if (profile.role === 'admin') {
        await ensureAuthBootstrapState(profile)
      }

      if (profile.status === 'frozen') {
        await signOut(firebaseAuth)
        callback({
          user: null,
          error: 'This account is frozen. Please contact admin.'
        })
        return
      }

      callback({ user: profile, error: '' })
    } catch (error) {
      console.error('Unable to load auth state.', error)
      callback({
        user: null,
        error: 'Unable to verify the current sign-in session.'
      })
    }
  })
}

export async function loginWithCredentials(username, password) {
  if (!ensureCloudReady()) {
    return getCloudUnavailableResult()
  }

  const cleanUsername = trimUserInput(username)
  const email = cleanUsername.includes('@')
    ? cleanUsername.toLowerCase()
    : createSyntheticEmail(cleanUsername)

  try {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email, String(password || ''))
    const loginTime = new Date().toISOString()
    const profile = await getUserProfileById(credential.user.uid)

    if (!profile) {
      await signOut(firebaseAuth)
      return {
        ok: false,
        error: 'This account is not fully prepared yet. Please contact admin.'
      }
    }

    if (profile.status === 'frozen') {
      await signOut(firebaseAuth)
      await recordAuthActivity({
        action: 'login-blocked',
        actorUserId: profile.id,
        actorName: profile.name,
        targetUserId: profile.id,
        targetName: profile.name,
        description: `Blocked login for frozen account ${profile.username}.`
      })
      return {
        ok: false,
        error: 'This account is frozen. Please contact admin.'
      }
    }

    await updateDoc(doc(firebaseDb, 'users', profile.id), {
      lastLoginAt: loginTime,
      updatedAt: loginTime
    })

    const nextUser = {
      ...profile,
      lastLoginAt: loginTime,
      updatedAt: loginTime
    }

    await recordAuthActivity({
      action: 'login-success',
      actorUserId: profile.id,
      actorName: profile.name,
      targetUserId: profile.id,
      targetName: profile.name,
      description: `${profile.name} signed in successfully.`
    })

    return {
      ok: true,
      user: nextUser
    }
  } catch (error) {
    const code = error?.code || 'UNKNOWN'
    await recordAuthActivity({
      action: 'login-failed',
      targetName: cleanUsername || 'unknown',
      description: `Failed login attempt for username "${cleanUsername || 'unknown'}".`
    })
    return {
      ok: false,
      error: mapAuthError(code)
    }
  }
}

export async function logoutCurrentUser() {
  if (!ensureCloudReady()) return
  const currentUser = firebaseAuth.currentUser ? await getUserProfileById(firebaseAuth.currentUser.uid) : null
  if (currentUser) {
    await recordAuthActivity({
      action: 'logout',
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      targetUserId: currentUser.id,
      targetName: currentUser.name,
      description: `${currentUser.name} signed out.`
    })
  }

  await signOut(firebaseAuth)
}

export async function createAuthUser({
  name,
  username,
  password,
  confirmPassword,
  role = 'staff',
  notes = '',
  actorUserId = null,
  allowWithoutExistingUsers = false
}) {
  if (!ensureCloudReady()) {
    return getCloudUnavailableResult()
  }

  const setupState = await getAuthSetupState()
  const cleanName = trimUserInput(name)
  const cleanUsername = normalizeUsername(username)
  const cleanPassword = String(password || '')
  const cleanConfirmPassword = String(confirmPassword || '')
  const safeRole = getSafeRole(role)
  const cleanNotes = trimUserInput(notes)

  if (!cleanName || !cleanUsername || !cleanPassword) {
    return { ok: false, error: 'Name, username, and password are required.' }
  }

  if (cleanPassword !== cleanConfirmPassword) {
    return { ok: false, error: 'Password and confirm password must match.' }
  }

  const passwordCheck = validatePassword(cleanPassword)
  if (!passwordCheck.ok) {
    return { ok: false, error: 'Password does not meet the required security rules.' }
  }

  if (setupState.needsFirstAdminSetup && !allowWithoutExistingUsers) {
    return { ok: false, error: 'Create the first admin account before adding more users.' }
  }

  const existingUser = await getUserProfileByUsername(cleanUsername)
  if (existingUser) {
    return { ok: false, error: 'This username is already in use.' }
  }

  const authResult = await createFirebaseAuthAccount({
    email: createSyntheticEmail(cleanUsername),
    password: cleanPassword
  })

  if (!authResult.ok) {
    return { ok: false, error: authResult.error }
  }

  const actorUser = actorUserId ? await getUserProfileById(actorUserId) : null
  const timestamp = new Date().toISOString()
  const nextUser = {
    uid: authResult.uid,
    name: cleanName,
    username: cleanUsername,
    email: createSyntheticEmail(cleanUsername),
    role: safeRole,
    status: 'active',
    notes: cleanNotes,
    createdBy: actorUser?.name || 'system',
    createdAt: timestamp,
    updatedAt: timestamp,
    lastLoginAt: ''
  }

  await setDoc(doc(firebaseDb, 'users', authResult.uid), nextUser)
  await recordAuthActivity({
    action: 'user-created',
    actorUserId: actorUser?.id || '',
    actorName: actorUser?.name || 'System',
    targetUserId: authResult.uid,
    targetName: nextUser.name,
    description: `${nextUser.name} was created as ${nextUser.role}.`
  })

  return {
    ok: true,
    user: sanitizeUser({ id: authResult.uid, ...nextUser })
  }
}

export async function createFirstAdminAccount({
  name,
  username,
  password,
  confirmPassword,
  notes = ''
}) {
  if (!ensureCloudReady()) {
    return getCloudUnavailableResult()
  }

  const setupState = await getAuthSetupState()
  if (!setupState.needsFirstAdminSetup) {
    return {
      ok: false,
      error: 'The first admin account is already set up. Please sign in.'
    }
  }

  return createAuthUser({
    name,
    username,
    password,
    confirmPassword,
    role: 'admin',
    notes,
    actorUserId: null,
    allowWithoutExistingUsers: true
  }).then(async (result) => {
    if (!result.ok) return result

    await writeAuthBootstrapState({
      firstAdminSetupComplete: true,
      hasUsers: true,
      hasAdmin: true,
      firstAdminUserId: result.user.id,
      firstAdminUsername: result.user.username,
      firstAdminName: result.user.name,
      source: 'first-admin-created'
    })

    await recordAuthActivity({
      action: 'first-admin-created',
      targetUserId: result.user.id,
      targetName: result.user.name,
      description: `${result.user.name} was created as the first admin account.`
    })

    return result
  })
}

export async function updateAuthUserStatus(userId, status, actorUserId = null) {
  if (!ensureCloudReady()) {
    return getCloudUnavailableResult()
  }

  const safeStatus = getSafeStatus(status)
  const users = await listSafeAuthUsers()
  const targetUser = users.find((user) => user.id === userId)
  const actorUser = actorUserId ? users.find((user) => user.id === actorUserId) : null

  if (!targetUser) {
    return { ok: false, error: 'User not found.' }
  }

  if (targetUser.id === actorUserId && safeStatus === 'frozen') {
    return { ok: false, error: 'You cannot freeze your own account.' }
  }

  if (!canLastActiveAdminBeChanged(users, targetUser, targetUser.role, safeStatus)) {
    return { ok: false, error: 'At least one active admin account must remain available.' }
  }

  const timestamp = new Date().toISOString()
  await updateDoc(doc(firebaseDb, 'users', userId), {
    status: safeStatus,
    updatedAt: timestamp
  })

  await recordAuthActivity({
    action: safeStatus === 'frozen' ? 'user-frozen' : 'user-unfrozen',
    actorUserId: actorUser?.id || '',
    actorName: actorUser?.name || 'System',
    targetUserId: targetUser.id,
    targetName: targetUser.name,
    description: `${targetUser.name} was marked ${safeStatus}.`
  })

  return {
    ok: true,
    user: {
      ...targetUser,
      status: safeStatus,
      updatedAt: timestamp
    }
  }
}

export async function updateAuthUserProfile(userId, updates, actorUserId = null) {
  if (!ensureCloudReady()) {
    return getCloudUnavailableResult()
  }

  const users = await listSafeAuthUsers()
  const targetUser = users.find((user) => user.id === userId)
  const actorUser = actorUserId ? users.find((user) => user.id === actorUserId) : null

  if (!targetUser) {
    return { ok: false, error: 'User not found.' }
  }

  const nextName = trimUserInput(updates.name || targetUser.name)
  const nextUsername = normalizeUsername(updates.username || targetUser.username)
  const nextRole = getSafeRole(updates.role || targetUser.role)
  const nextNotes = trimUserInput(updates.notes ?? targetUser.notes ?? '')

  if (!nextName || !nextUsername) {
    return { ok: false, error: 'Name and username are required.' }
  }

  if (nextUsername !== targetUser.username) {
    return {
      ok: false,
      error: 'Username changes are locked for cloud accounts right now.'
    }
  }

  if (!canLastActiveAdminBeChanged(users, targetUser, nextRole, targetUser.status)) {
    return { ok: false, error: 'At least one active admin account must remain available.' }
  }

  const timestamp = new Date().toISOString()
  await updateDoc(doc(firebaseDb, 'users', userId), {
    name: nextName,
    role: nextRole,
    notes: nextNotes,
    updatedAt: timestamp
  })

  await recordAuthActivity({
    action: 'user-updated',
    actorUserId: actorUser?.id || '',
    actorName: actorUser?.name || 'System',
    targetUserId: targetUser.id,
    targetName: nextName,
    description: `${nextName}'s profile was updated.`
  })

  return {
    ok: true,
    user: {
      ...targetUser,
      name: nextName,
      role: nextRole,
      notes: nextNotes,
      updatedAt: timestamp
    }
  }
}

export async function deleteAuthUserProfile(userId, actorUserId = null) {
  if (!ensureCloudReady()) {
    return getCloudUnavailableResult()
  }

  const users = await listSafeAuthUsers()
  const targetUser = users.find((user) => user.id === userId)
  const actorUser = actorUserId ? users.find((user) => user.id === actorUserId) : null

  if (!targetUser) {
    return { ok: false, error: 'User not found.' }
  }

  if (targetUser.id === actorUserId) {
    return { ok: false, error: 'You cannot delete your own account from inside the app.' }
  }

  if (!canLastActiveAdminBeChanged(users, targetUser, 'staff', 'frozen')) {
    return { ok: false, error: 'At least one active admin account must remain available.' }
  }

  await recordAuthActivity({
    action: 'user-deleted',
    actorUserId: actorUser?.id || '',
    actorName: actorUser?.name || 'System',
    targetUserId: targetUser.id,
    targetName: targetUser.name,
    description: `${targetUser.name} was removed from the app user list.`
  })

  await deleteDoc(doc(firebaseDb, 'users', userId))

  return {
    ok: true,
    user: targetUser
  }
}

export async function changeAuthUserPassword() {
  return {
    ok: false,
    error: 'Password reset for other users will be added in the secure cloud user phase.'
  }
}
