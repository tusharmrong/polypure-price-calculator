import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  PencilLine,
  Phone,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Snowflake,
  Trash2,
  UserRound,
  UserRoundPlus,
  X
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import TextArea from '../components/TextArea.jsx'
import { validatePassword } from '../utils/auth.js'
import { useAuth } from '../utils/authContext.jsx'
import {
  PERMISSION_DETAILS,
  PERMISSION_GROUPS,
  PERMISSIONS,
  ROLE_PRESETS,
  getUserPermissions
} from '../utils/permissions.js'

function formatDateTime(value) {
  if (!value) return 'Not signed in yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

function PasswordChecklist({ password }) {
  const result = validatePassword(password)

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Password Requirements</p>
      <div className="mt-2 grid gap-1">
        {result.checks.map((check, index) => (
          <p
            className={`text-xs font-medium flex items-center gap-1.5 ${
              check.ok ? 'text-emerald-700' : 'text-slate-500'
            }`}
            key={`${check.label}-${index}`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${check.ok ? 'bg-emerald-600' : 'bg-slate-300'}`} />
            {check.label}
          </p>
        ))}
      </div>
    </div>
  )
}

function PermissionSelector({
  role,
  selectedPermissions = [],
  onChange,
  disabled = false
}) {
  const isAdmin = role === 'admin'
  const effectivePermissions = isAdmin ? Object.values(PERMISSIONS) : selectedPermissions

  const groupedDetails = useMemo(() => {
    const map = {}
    Object.values(PERMISSION_GROUPS).forEach((group) => {
      map[group] = []
    })
    PERMISSION_DETAILS.forEach((item) => {
      if (!map[item.group]) map[item.group] = []
      map[item.group].push(item)
    })
    return map
  }, [])

  const applyPreset = (presetKey) => {
    if (disabled || isAdmin) return
    const preset = ROLE_PRESETS[presetKey]
    if (preset) {
      onChange(preset.permissions)
    }
  }

  const togglePermission = (key) => {
    if (disabled || isAdmin) return
    if (effectivePermissions.includes(key)) {
      onChange(effectivePermissions.filter((p) => p !== key))
    } else {
      onChange([...effectivePermissions, key])
    }
  }

  const selectAll = () => {
    if (disabled || isAdmin) return
    onChange(Object.values(PERMISSIONS))
  }

  const clearAll = () => {
    if (disabled || isAdmin) return
    onChange([])
  }

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-brand-700" aria-hidden="true" />
          <p className="text-sm font-bold text-slate-950">Access Permissions</p>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          {isAdmin ? 'All granted (Admin)' : `${effectivePermissions.length} of ${Object.keys(PERMISSIONS).length} allowed`}
        </span>
      </div>

      {isAdmin ? (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-800">
          Administrators automatically possess full system access and permission to all modules.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-bold text-slate-500 mr-1">Presets:</span>
            <button
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              onClick={() => applyPreset('staff_full')}
              type="button"
            >
              Standard Staff
            </button>
            <button
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              onClick={() => applyPreset('sales')}
              type="button"
            >
              Sales Executive
            </button>
            <button
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              onClick={() => applyPreset('accounts')}
              type="button"
            >
              Accounts & Billing
            </button>
            <button
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              onClick={() => applyPreset('viewer')}
              type="button"
            >
              Viewer
            </button>
            <button
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 ml-auto"
              onClick={selectAll}
              type="button"
            >
              Select All
            </button>
            <button
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              onClick={clearAll}
              type="button"
            >
              Clear
            </button>
          </div>

          <div className="grid gap-3 pt-2">
            {Object.entries(groupedDetails).map(([groupName, items]) => (
              <div className="rounded-lg border border-slate-200/80 bg-white p-3" key={groupName}>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {groupName}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map((item) => {
                    const isChecked = effectivePermissions.includes(item.key)
                    return (
                      <label
                        className={`flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition select-none ${
                          isChecked
                            ? 'border-brand-300 bg-brand-50/40 text-slate-900'
                            : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-50'
                        }`}
                        key={item.key}
                      >
                        <input
                          checked={isChecked}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          disabled={disabled || isAdmin}
                          onChange={() => togglePermission(item.key)}
                          type="checkbox"
                        />
                        <div className="grid gap-0.5 text-left">
                          <span className="text-xs font-bold leading-snug">{item.label}</span>
                          <span className="text-[11px] text-slate-500 leading-tight">
                            {item.description}
                          </span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Users() {
  const {
    currentUser,
    users,
    activityLogs,
    createUser,
    setUserStatus,
    updateUserProfile,
    deleteUserProfile,
    changeUserPassword
  } = useAuth()

  const [createForm, setCreateForm] = useState({
    name: '',
    username: '',
    phone: '',
    email: '',
    designation: '',
    password: '',
    confirmPassword: '',
    role: 'staff',
    customPermissions: ROLE_PRESETS.staff_full.permissions,
    notes: ''
  })

  const [filters, setFilters] = useState({
    query: '',
    role: 'all',
    status: 'all'
  })

  const [selectedUserId, setSelectedUserId] = useState('')
  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    phone: '',
    email: '',
    designation: '',
    role: 'staff',
    customPermissions: [],
    notes: ''
  })

  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: ''
  })

  const [showPassword, setShowPassword] = useState({
    create: false,
    createConfirm: false,
    reset: false,
    resetConfirm: false
  })

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [activeDetailTab, setActiveDetailTab] = useState('profile')
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [resetFeedback, setResetFeedback] = useState({ type: '', message: '' })
  const [isResetting, setIsResetting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const sortedUsers = useMemo(
    () =>
      [...users].sort((left, right) => {
        if (left.role !== right.role) return left.role === 'admin' ? -1 : 1
        return left.name.localeCompare(right.name)
      }),
    [users]
  )

  const filteredUsers = useMemo(() => {
    const keyword = filters.query.trim().toLowerCase()

    return sortedUsers.filter((user) => {
      const roleMatch = filters.role === 'all' || user.role === filters.role
      const statusMatch = filters.status === 'all' || user.status === filters.status
      const keywordMatch =
        !keyword ||
        `${user.name} ${user.username} ${user.role} ${user.phone || ''} ${user.designation || ''} ${user.email || ''}`
          .toLowerCase()
          .includes(keyword)

      return roleMatch && statusMatch && keywordMatch
    })
  }, [filters, sortedUsers])

  const selectedUser = useMemo(
    () => sortedUsers.find((user) => user.id === selectedUserId) || sortedUsers[0] || null,
    [selectedUserId, sortedUsers]
  )

  useEffect(() => {
    if (!selectedUser && sortedUsers.length) {
      setSelectedUserId(sortedUsers[0].id)
      return
    }

    if (selectedUser) {
      setEditForm({
        name: selectedUser.name || '',
        username: selectedUser.username || '',
        phone: selectedUser.phone || '',
        email: selectedUser.contactEmail || selectedUser.email || '',
        designation: selectedUser.designation || '',
        role: selectedUser.role || 'staff',
        customPermissions: getUserPermissions(selectedUser),
        notes: selectedUser.notes || ''
      })
      setPasswordForm({ password: '', confirmPassword: '' })
      setResetFeedback({ type: '', message: '' })
    }
  }, [selectedUser, sortedUsers])

  const recentActivity = useMemo(() => activityLogs.slice(0, 10), [activityLogs])

  const updateCreateField = (key, value) => {
    setCreateForm((current) => ({ ...current, [key]: value }))
  }

  const updateEditField = (key, value) => {
    setEditForm((current) => ({ ...current, [key]: value }))
  }

  const updatePasswordField = (key, value) => {
    setPasswordForm((current) => ({ ...current, [key]: value }))
    if (resetFeedback.message) setResetFeedback({ type: '', message: '' })
  }

  const handleCreateUser = async (event) => {
    event.preventDefault()
    setIsCreating(true)
    setFeedback({ type: '', message: '' })

    const result = await createUser(createForm)
    setIsCreating(false)

    if (!result.ok) {
      setFeedback({ type: 'error', message: result.error })
      return
    }

    setCreateForm({
      name: '',
      username: '',
      phone: '',
      email: '',
      designation: '',
      password: '',
      confirmPassword: '',
      role: 'staff',
      customPermissions: ROLE_PRESETS.staff_full.permissions,
      notes: ''
    })
    setSelectedUserId(result.user.id)
    setIsCreateModalOpen(false)
    setFeedback({
      type: 'success',
      message: `${result.user.name} was created successfully and is ready to sign in as ${result.user.role}.`
    })
  }

  const handleStatusChange = async (userId, nextStatus) => {
    const result = await setUserStatus(userId, nextStatus)
    setFeedback({
      type: result.ok ? 'success' : 'error',
      message: result.ok
        ? `User ${nextStatus === 'frozen' ? 'frozen' : 'reactivated'} successfully.`
        : result.error
    })
  }

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    if (!selectedUser) return
    setIsSaving(true)
    setFeedback({ type: '', message: '' })

    const result = await updateUserProfile(selectedUser.id, editForm)
    setIsSaving(false)

    setFeedback({
      type: result.ok ? 'success' : 'error',
      message: result.ok ? `${result.user.name} updated successfully.` : result.error
    })
  }

  const handleDeleteUser = async (user) => {
    if (!user) return

    const confirmed = window.confirm(
      `Delete ${user.name} from the app?\n\nThis removes the user profile from the app and blocks login through this system.`
    )

    if (!confirmed) return

    const result = await deleteUserProfile(user.id)
    if (!result.ok) {
      setFeedback({ type: 'error', message: result.error })
      return
    }

    setFeedback({
      type: 'success',
      message: `${user.name} was deleted from the app user list.`
    })

    if (selectedUserId === user.id) {
      setSelectedUserId('')
    }
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()
    if (!selectedUser) return

    setIsResetting(true)
    setResetFeedback({ type: '', message: '' })

    const result = await changeUserPassword(
      selectedUser.id,
      passwordForm.password,
      passwordForm.confirmPassword
    )
    setIsResetting(false)

    if (!result.ok) {
      setResetFeedback({ type: 'error', message: result.error })
      return
    }

    setPasswordForm({ password: '', confirmPassword: '' })
    setResetFeedback({
      type: 'success',
      message: result.message || `Password updated successfully for ${selectedUser.name}.`
    })
  }

  return (
    <div className="grid gap-6">
      {/* Top Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-700">Team Access & Security</p>
          <h1 className="text-2xl font-bold text-slate-950">Users Management</h1>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} type="button">
          <UserRoundPlus size={18} aria-hidden="true" />
          Create New User
        </Button>
      </div>

      {feedback.message ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {/* Main 2-Column Section */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Team Directory (5 cols on lg) */}
        <div className="lg:col-span-5 grid gap-4">
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Directory</p>
                <h2 className="text-xl font-bold text-slate-950">Team Accounts</h2>
              </div>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {filteredUsers.length} shown
              </span>
            </div>

            {/* Search & Filters */}
            <div className="mb-4 grid gap-3">
              <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                Search
                <div className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100">
                  <Search size={16} className="text-slate-400" aria-hidden="true" />
                  <input
                    className="w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                    placeholder="Search name, username, phone, role..."
                    type="text"
                    value={filters.query}
                  />
                </div>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <Select
                  id="filter-role"
                  label="Role"
                  onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}
                  selectClassName="min-h-10 text-xs"
                  value={filters.role}
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admins</option>
                  <option value="staff">Staff</option>
                </Select>
                <Select
                  id="filter-status"
                  label="Status"
                  onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                  selectClassName="min-h-10 text-xs"
                  value={filters.status}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="frozen">Frozen</option>
                </Select>
              </div>
            </div>

            {/* Users List Cards */}
            <div className="grid gap-3 max-h-[750px] overflow-y-auto pr-1">
              {filteredUsers.map((user) => {
                const isFrozen = user.status === 'frozen'
                const isSelected = selectedUser?.id === user.id
                const userPerms = getUserPermissions(user)

                return (
                  <div
                    className={`rounded-xl border p-4 cursor-pointer transition text-left ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/50 shadow-sm ring-1 ring-brand-500'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-brand-700 shadow-soft ${
                            user.role === 'admin' ? 'bg-brand-50 border-brand-200' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          {user.role === 'admin' ? (
                            <ShieldCheck size={20} aria-hidden="true" />
                          ) : (
                            <UserRound size={20} aria-hidden="true" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-bold text-slate-950 truncate">{user.name}</p>
                            {user.designation ? (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 truncate">
                                {user.designation}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs font-mono text-slate-500">@{user.username}</p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          isFrozen
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isFrozen ? 'Frozen' : 'Active'}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                        {user.role === 'admin' ? 'Admin' : 'Staff'}
                      </span>
                      <span className="rounded-md bg-brand-50 px-2 py-0.5 text-brand-700">
                        {user.role === 'admin' ? 'Full Access' : `${userPerms.length} Perms`}
                      </span>
                      {user.phone ? (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Phone size={11} /> {user.phone}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}

              {filteredUsers.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  No users found matching the filter criteria.
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        {/* Right Column: Selected User Management Hub (7 cols on lg) */}
        <div className="lg:col-span-7 grid gap-4">
          {selectedUser ? (
            <Card>
              {/* Selected User Header Card */}
              <div className="mb-6 flex flex-col gap-3 pb-5 border-b border-slate-200 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft font-bold text-lg">
                    {selectedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-950">{selectedUser.name}</h2>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          selectedUser.status === 'frozen'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {selectedUser.status === 'frozen' ? 'Frozen' : 'Active'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-mono font-semibold text-slate-700">@{selectedUser.username}</span>
                      {selectedUser.designation ? <span>• {selectedUser.designation}</span> : null}
                      <span>• Last Login: {formatDateTime(selectedUser.lastLoginAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() =>
                      handleStatusChange(
                        selectedUser.id,
                        selectedUser.status === 'frozen' ? 'active' : 'frozen'
                      )
                    }
                    type="button"
                    variant={selectedUser.status === 'frozen' ? 'primary' : 'secondary'}
                  >
                    <Snowflake size={15} aria-hidden="true" />
                    {selectedUser.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
                  </Button>
                  <Button
                    onClick={() => handleDeleteUser(selectedUser)}
                    type="button"
                    variant="secondary"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200 mb-5">
                <button
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition ${
                    activeDetailTab === 'profile'
                      ? 'border-brand-600 text-brand-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                  onClick={() => setActiveDetailTab('profile')}
                  type="button"
                >
                  <PencilLine size={16} />
                  Profile Details
                </button>
                <button
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition ${
                    activeDetailTab === 'permissions'
                      ? 'border-brand-600 text-brand-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                  onClick={() => setActiveDetailTab('permissions')}
                  type="button"
                >
                  <SlidersHorizontal size={16} />
                  Permissions Matrix
                </button>
                <button
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition ${
                    activeDetailTab === 'password'
                      ? 'border-brand-600 text-brand-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                  onClick={() => setActiveDetailTab('password')}
                  type="button"
                >
                  <KeyRound size={16} />
                  Reset Password
                </button>
              </div>

              {/* Tab 1: Profile Form */}
              {activeDetailTab === 'profile' ? (
                <form className="grid gap-4" onSubmit={handleSaveProfile}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      id="edit-name"
                      label="Full Name *"
                      onChange={(event) => updateEditField('name', event.target.value)}
                      required
                      value={editForm.name}
                    />
                    <Input
                      id="edit-username"
                      inputClassName="bg-slate-50 text-slate-500 font-mono"
                      label="Username"
                      readOnly
                      value={editForm.username}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      id="edit-phone"
                      label="Phone Number"
                      onChange={(event) => updateEditField('phone', event.target.value)}
                      placeholder="e.g. +880 1712 345678"
                      type="tel"
                      value={editForm.phone}
                    />
                    <Input
                      id="edit-designation"
                      label="Designation / Department"
                      onChange={(event) => updateEditField('designation', event.target.value)}
                      placeholder="e.g. Sales Executive / Cashier"
                      value={editForm.designation}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      id="edit-email"
                      label="Contact Email"
                      onChange={(event) => updateEditField('email', event.target.value)}
                      placeholder="e.g. staff@company.com"
                      type="email"
                      value={editForm.email}
                    />
                    <Select
                      id="edit-role"
                      label="System Role *"
                      onChange={(event) => {
                        const role = event.target.value
                        updateEditField('role', role)
                        if (role === 'admin') {
                          updateEditField('customPermissions', Object.values(PERMISSIONS))
                        }
                      }}
                      selectClassName="min-h-12"
                      value={editForm.role}
                    >
                      <option value="staff">Staff Member</option>
                      <option value="admin">Administrator</option>
                    </Select>
                  </div>

                  <TextArea
                    id="edit-notes"
                    label="Account Notes"
                    onChange={(event) => updateEditField('notes', event.target.value)}
                    placeholder="Notes or branch assignment"
                    textAreaClassName="min-h-20"
                    value={editForm.notes}
                  />

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button disabled={isSaving} type="submit">
                      <Check size={18} aria-hidden="true" />
                      {isSaving ? 'Saving...' : 'Save Profile Changes'}
                    </Button>
                  </div>
                </form>
              ) : null}

              {/* Tab 2: Permissions Matrix */}
              {activeDetailTab === 'permissions' ? (
                <form className="grid gap-4" onSubmit={handleSaveProfile}>
                  <PermissionSelector
                    onChange={(perms) => updateEditField('customPermissions', perms)}
                    role={editForm.role}
                    selectedPermissions={editForm.customPermissions}
                  />

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button disabled={isSaving} type="submit">
                      <Check size={18} aria-hidden="true" />
                      {isSaving ? 'Saving...' : 'Save Permissions'}
                    </Button>
                  </div>
                </form>
              ) : null}

              {/* Tab 3: Password Reset */}
              {activeDetailTab === 'password' ? (
                <form
                  className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5"
                  onSubmit={handleResetPassword}
                >
                  <div className="flex items-center gap-2">
                    <KeyRound size={20} className="text-brand-700" aria-hidden="true" />
                    <div>
                      <h3 className="text-base font-bold text-slate-950">Security Password Update</h3>
                      <p className="text-xs text-slate-500">
                        Set a new password for <strong>{selectedUser.name}</strong> (@{selectedUser.username}).
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 pt-2">
                    <label className="grid w-full min-w-0 gap-1.5 text-sm font-medium text-slate-700" htmlFor="reset-password">
                      New Password
                      <div className="flex min-h-12 items-center rounded-lg border border-slate-200 bg-white px-3 focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-100">
                        <input
                          className="w-full border-0 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                          id="reset-password"
                          onChange={(event) => updatePasswordField('password', event.target.value)}
                          placeholder="Enter new password"
                          required
                          type={showPassword.reset ? 'text' : 'password'}
                          value={passwordForm.password}
                        />
                        <button
                          className="ml-2 text-slate-400 transition hover:text-slate-700"
                          onClick={() => setShowPassword((c) => ({ ...c, reset: !c.reset }))}
                          type="button"
                        >
                          {showPassword.reset ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                        </button>
                      </div>
                    </label>

                    <label className="grid w-full min-w-0 gap-1.5 text-sm font-medium text-slate-700" htmlFor="reset-confirm-password">
                      Confirm New Password
                      <div className="flex min-h-12 items-center rounded-lg border border-slate-200 bg-white px-3 focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-100">
                        <input
                          className="w-full border-0 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                          id="reset-confirm-password"
                          onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
                          placeholder="Repeat new password"
                          required
                          type={showPassword.resetConfirm ? 'text' : 'password'}
                          value={passwordForm.confirmPassword}
                        />
                        <button
                          className="ml-2 text-slate-400 transition hover:text-slate-700"
                          onClick={() => setShowPassword((c) => ({ ...c, resetConfirm: !c.resetConfirm }))}
                          type="button"
                        >
                          {showPassword.resetConfirm ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                        </button>
                      </div>
                    </label>
                  </div>

                  <PasswordChecklist password={passwordForm.password} />

                  {resetFeedback.message ? (
                    <div
                      className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                        resetFeedback.type === 'success'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-rose-200 bg-rose-50 text-rose-700'
                      }`}
                    >
                      {resetFeedback.message}
                    </div>
                  ) : null}

                  <Button
                    disabled={
                      isResetting ||
                      !passwordForm.password ||
                      !passwordForm.confirmPassword ||
                      passwordForm.password !== passwordForm.confirmPassword
                    }
                    type="submit"
                  >
                    <KeyRound size={16} aria-hidden="true" />
                    {isResetting ? 'Updating password...' : 'Update Password'}
                  </Button>
                </form>
              ) : null}
            </Card>
          ) : (
            <Card>
              <div className="p-8 text-center text-slate-500">
                <UserRound size={36} className="mx-auto mb-2 text-slate-300" />
                <p className="font-semibold">No user selected</p>
                <p className="text-xs text-slate-400 mt-1">Select a user from the directory on the left or create a new user account.</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Full-width Activity Logs Card */}
      <Card>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Audit Trail</p>
          <h2 className="text-xl font-bold text-slate-950">Recent Access Activity</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {recentActivity.map((log) => (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3" key={log.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-800">
                  {log.action}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {formatDateTime(log.createdAt)}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-slate-700">{log.description}</p>
              {(log.actorName || log.targetName) ? (
                <p className="mt-1 text-xs text-slate-500">
                  {log.actorName ? `By: ${log.actorName}` : 'By: System'}
                  {log.targetName ? ` | Target: ${log.targetName}` : ''}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      {/* Create New User Modal Dialog */}
      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <UserRoundPlus size={22} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Create New User</h2>
                  <p className="text-xs text-slate-500">Add a new staff or admin member with customized permissions.</p>
                </div>
              </div>
              <button
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                onClick={() => setIsCreateModalOpen(false)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <form className="grid gap-4" onSubmit={handleCreateUser}>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  id="user-name"
                  label="Full Name *"
                  onChange={(event) => updateCreateField('name', event.target.value)}
                  placeholder="Example: Rahim Uddin"
                  required
                  value={createForm.name}
                />
                <Input
                  id="user-username"
                  label="Username *"
                  onChange={(event) => updateCreateField('username', event.target.value)}
                  placeholder="example: rahim"
                  required
                  value={createForm.username}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  id="user-phone"
                  label="Phone Number"
                  onChange={(event) => updateCreateField('phone', event.target.value)}
                  placeholder="e.g. +880 1712 345678"
                  type="tel"
                  value={createForm.phone}
                />
                <Input
                  id="user-designation"
                  label="Designation / Department"
                  onChange={(event) => updateCreateField('designation', event.target.value)}
                  placeholder="e.g. Sales Executive / Cashier"
                  value={createForm.designation}
                />
              </div>

              <Input
                id="user-email"
                label="Contact Email (Optional)"
                onChange={(event) => updateCreateField('email', event.target.value)}
                placeholder="e.g. rahim@company.com"
                type="email"
                value={createForm.email}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid w-full min-w-0 gap-1.5 text-sm font-medium text-slate-700" htmlFor="user-password">
                  Temporary Password *
                  <div className="flex min-h-12 items-center rounded-lg border border-slate-200 bg-white px-3 focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-100">
                    <input
                      className="w-full border-0 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                      id="user-password"
                      onChange={(event) => updateCreateField('password', event.target.value)}
                      placeholder="Set initial password"
                      required
                      type={showPassword.create ? 'text' : 'password'}
                      value={createForm.password}
                    />
                    <button
                      className="ml-2 text-slate-400 transition hover:text-slate-700"
                      onClick={() => setShowPassword((c) => ({ ...c, create: !c.create }))}
                      type="button"
                    >
                      {showPassword.create ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                    </button>
                  </div>
                </label>

                <label className="grid w-full min-w-0 gap-1.5 text-sm font-medium text-slate-700" htmlFor="user-confirm-password">
                  Confirm Password *
                  <div className="flex min-h-12 items-center rounded-lg border border-slate-200 bg-white px-3 focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-100">
                    <input
                      className="w-full border-0 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                      id="user-confirm-password"
                      onChange={(event) => updateCreateField('confirmPassword', event.target.value)}
                      placeholder="Repeat initial password"
                      required
                      type={showPassword.createConfirm ? 'text' : 'password'}
                      value={createForm.confirmPassword}
                    />
                    <button
                      className="ml-2 text-slate-400 transition hover:text-slate-700"
                      onClick={() => setShowPassword((c) => ({ ...c, createConfirm: !c.createConfirm }))}
                      type="button"
                    >
                      {showPassword.createConfirm ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                    </button>
                  </div>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)] md:items-start">
                <Select
                  id="user-role"
                  label="System Role *"
                  onChange={(event) => {
                    const role = event.target.value
                    updateCreateField('role', role)
                    if (role === 'admin') {
                      updateCreateField('customPermissions', Object.values(PERMISSIONS))
                    } else {
                      updateCreateField('customPermissions', ROLE_PRESETS.staff_full.permissions)
                    }
                  }}
                  selectClassName="min-h-12"
                  value={createForm.role}
                >
                  <option value="staff">Staff Member</option>
                  <option value="admin">Administrator</option>
                </Select>
                <TextArea
                  className="h-full"
                  id="user-notes"
                  label="Account Notes"
                  onChange={(event) => updateCreateField('notes', event.target.value)}
                  placeholder="Optional notes or branch details"
                  textAreaClassName="min-h-20"
                  value={createForm.notes}
                />
              </div>

              <PermissionSelector
                onChange={(perms) => updateCreateField('customPermissions', perms)}
                role={createForm.role}
                selectedPermissions={createForm.customPermissions}
              />

              <PasswordChecklist password={createForm.password} />

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  onClick={() => setIsCreateModalOpen(false)}
                  type="button"
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button disabled={isCreating} type="submit">
                  <UserRoundPlus size={18} aria-hidden="true" />
                  {isCreating ? 'Creating account...' : 'Create User Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

