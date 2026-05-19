import { Download, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRoundPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import { APP_NAME } from '../utils/appMeta.js'
import { useAuth } from '../utils/authContext.jsx'

export default function Login() {
  const { currentUser, authError, authReady, login, getDefaultRoute, needsFirstAdminSetup, createFirstAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [firstAdminForm, setFirstAdminForm] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showSetupPassword, setShowSetupPassword] = useState(false)
  const [showSetupConfirmPassword, setShowSetupConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installStatus, setInstallStatus] = useState('')

  useEffect(() => {
    if (location.state?.from) {
      setStatus({
        type: 'info',
        message: 'Please sign in first to continue.'
      })
    }
  }, [location.state])

  useEffect(() => {
    const installed =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    setIsInstalled(installed)

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }

    const handleInstalled = () => {
      setInstallStatus('App installed successfully.')
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (currentUser) {
    return <Navigate replace to={getDefaultRoute()} />
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-xl">
          <Card>
            <p className="text-sm font-semibold text-slate-500">Preparing secure access...</p>
          </Card>
        </div>
      </div>
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    const result = await login(username, password)
    setLoading(false)
    if (!result.ok) {
      setStatus({
        type: 'error',
        message: result.error
      })
      return
    }

    setStatus({ type: '', message: '' })
    navigate(result.user.role === 'admin' ? '/' : '/calculator', { replace: true })
  }

  const handleInstallApp = async () => {
    if (isInstalled) {
      setInstallStatus('App is already installed on this device.')
      return
    }

    if (!deferredPrompt) {
      setInstallStatus('Install option is not ready in this browser yet. On iPhone, open Safari share menu and choose Add to Home Screen.')
      return
    }

    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setInstallStatus(choice?.outcome === 'accepted' ? 'Install request accepted.' : 'Install cancelled.')
    setDeferredPrompt(null)
  }

  const updateFirstAdminField = (key, value) => {
    setFirstAdminForm((current) => ({ ...current, [key]: value }))
    if (status.message) setStatus({ type: '', message: '' })
  }

  const handleCreateFirstAdmin = async (event) => {
    event.preventDefault()
    setLoading(true)

    const result = await createFirstAdmin(firstAdminForm)
    if (!result.ok) {
      setLoading(false)
      setStatus({
        type: 'error',
        message: result.error
      })
      return
    }

    const loginResult = await login(firstAdminForm.username, firstAdminForm.password)
    setLoading(false)

    if (!loginResult.ok) {
      setStatus({
        type: 'info',
        message: 'The first admin account is ready. Please sign in with it now.'
      })
      setUsername(firstAdminForm.username)
      setPassword(firstAdminForm.password)
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
        <Card className="w-full bg-brand-600 text-white">
          <div className="flex items-center gap-4">
            <img
              alt="Poly Pure"
              className="h-20 w-20 rounded-full border-2 border-white bg-white object-contain"
              src={`${import.meta.env.BASE_URL}poly-pure-logo.png`}
            />
            <div>
              <h1 className="text-3xl font-bold leading-tight">{APP_NAME}</h1>
            </div>
          </div>
        </Card>

        <Card className="w-full">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Secure Login</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              {needsFirstAdminSetup ? 'Create first admin' : 'Sign in'}
            </h2>
            {needsFirstAdminSetup ? (
              <p className="mt-2 text-sm text-slate-500">
                This is the first-time cloud setup. Create the main admin account once, then we can sign in normally.
              </p>
            ) : null}
          </div>

          {needsFirstAdminSetup ? (
            <form className="grid gap-4" onSubmit={handleCreateFirstAdmin}>
              <Input
                autoComplete="name"
                id="first-admin-name"
                label="Admin Name"
                onChange={(event) => updateFirstAdminField('name', event.target.value)}
                placeholder="Example: Poly Pure Admin"
                value={firstAdminForm.name}
              />

              <Input
                autoComplete="username"
                id="first-admin-username"
                label="Username"
                onChange={(event) => updateFirstAdminField('username', event.target.value)}
                placeholder="Example: admin"
                value={firstAdminForm.username}
              />

              <label className="grid w-full min-w-0 gap-2 text-sm font-medium text-slate-700" htmlFor="first-admin-password">
                Password
                <div className="flex min-h-12 items-center rounded-lg border border-slate-200 bg-white px-3 focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-100">
                  <input
                    autoComplete="new-password"
                    className="w-full border-0 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                    id="first-admin-password"
                    onChange={(event) => updateFirstAdminField('password', event.target.value)}
                    placeholder="Create a secure admin password"
                    type={showSetupPassword ? 'text' : 'password'}
                    value={firstAdminForm.password}
                  />
                  <button
                    className="ml-2 text-slate-400 transition hover:text-slate-700"
                    onClick={() => setShowSetupPassword((current) => !current)}
                    type="button"
                  >
                    {showSetupPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </label>

              <label className="grid w-full min-w-0 gap-2 text-sm font-medium text-slate-700" htmlFor="first-admin-confirm-password">
                Confirm Password
                <div className="flex min-h-12 items-center rounded-lg border border-slate-200 bg-white px-3 focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-100">
                  <input
                    autoComplete="new-password"
                    className="w-full border-0 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                    id="first-admin-confirm-password"
                    onChange={(event) => updateFirstAdminField('confirmPassword', event.target.value)}
                    placeholder="Repeat the password"
                    type={showSetupConfirmPassword ? 'text' : 'password'}
                    value={firstAdminForm.confirmPassword}
                  />
                  <button
                    className="ml-2 text-slate-400 transition hover:text-slate-700"
                    onClick={() => setShowSetupConfirmPassword((current) => !current)}
                    type="button"
                  >
                    {showSetupConfirmPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </label>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <UserRoundPlus size={16} aria-hidden="true" />
                  First admin setup
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  This account becomes the main admin. After it is created, normal sign-in and staff creation will be available from inside the app.
                </p>
              </div>

              <Button
                disabled={
                  loading ||
                  !firstAdminForm.name.trim() ||
                  !firstAdminForm.username.trim() ||
                  !firstAdminForm.password ||
                  !firstAdminForm.confirmPassword
                }
                type="submit"
              >
                <ShieldCheck size={18} aria-hidden="true" />
                {loading ? 'Creating admin...' : 'Create First Admin'}
              </Button>
            </form>
          ) : (
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <Input
                autoComplete="username"
                id="login-username"
                label="Username or Email"
                onChange={(event) => {
                  setUsername(event.target.value)
                  if (status.message) setStatus({ type: '', message: '' })
                }}
                placeholder="e.g. admin"
                value={username}
              />

              <label className="grid w-full min-w-0 gap-2 text-sm font-medium text-slate-700" htmlFor="login-password">
                Password
                <div className="flex min-h-12 items-center rounded-lg border border-slate-200 bg-white px-3 focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-100">
                  <input
                    autoComplete="current-password"
                    className="w-full border-0 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                    id="login-password"
                    onChange={(event) => {
                      setPassword(event.target.value)
                      if (status.message) setStatus({ type: '', message: '' })
                    }}
                    placeholder="Enter password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <button
                    className="ml-2 text-slate-400 transition hover:text-slate-700"
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </label>

              <Button disabled={loading || !username.trim() || !password} type="submit">
                <LockKeyhole size={18} aria-hidden="true" />
                {loading ? 'Signing in...' : 'Login'}
              </Button>
            </form>
          )}

          {authError ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
              {authError}
            </div>
          ) : null}

          {status.message ? (
            <div
              className={`mt-4 rounded-lg border px-3 py-2 text-sm font-medium ${
                status.type === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-brand-100 bg-brand-50 text-brand-700'
              }`}
            >
              {status.message}
            </div>
          ) : null}
        </Card>

        <Card className="w-full">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Install App</p>
              <p className="mt-1 text-sm text-slate-500">
                Install on phone or PC for quick access and full-screen use.
              </p>
            </div>
            <Button
              className="w-full sm:w-auto"
              disabled={isInstalled}
              onClick={handleInstallApp}
              type="button"
              variant={isInstalled ? 'muted' : 'secondary'}
            >
              <Download size={18} aria-hidden="true" />
              {isInstalled ? 'Already Installed' : 'Install App'}
            </Button>
          </div>
          {installStatus ? (
            <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
              {installStatus}
            </p>
          ) : null}
        </Card>
      </div>
    </div>
  )
}
