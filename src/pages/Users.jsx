import {
  KeyRound,
  PencilLine,
  Search,
  ShieldCheck,
  Snowflake,
  Trash2,
  UserRound,
  UserRoundPlus
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import TextArea from '../components/TextArea.jsx'
import { validatePassword } from '../utils/auth.js'
import { useAuth } from '../utils/authContext.jsx'

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
      <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Password Rules</p>
      <div className="mt-2 grid gap-1">
        {result.checks.map((check, index) => (
          <p
            className={`text-xs font-medium ${check.ok ? 'text-emerald-700' : 'text-slate-500'}`}
            key={`${check.label}-${index}`}
          >
            {check.ok ? 'OK' : '-'} {check.label}
          </p>
        ))}
      </div>
    </div>
  )
}

export default function Users() {
  const {
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
    password: '',
    confirmPassword: '',
    role: 'staff',
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
    role: 'staff',
    notes: ''
  })
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: ''
  })
  const [feedback, setFeedback] = useState({ type: '', message: '' })

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
        `${user.name} ${user.username} ${user.role}`.toLowerCase().includes(keyword)

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
        name: selectedUser.name,
        username: selectedUser.username,
        role: selectedUser.role,
        notes: selectedUser.notes || ''
      })
    }
  }, [selectedUser, sortedUsers])

  const recentActivity = useMemo(() => activityLogs.slice(0, 8), [activityLogs])

  const updateCreateField = (key, value) => {
    setCreateForm((current) => ({ ...current, [key]: value }))
  }

  const updateEditField = (key, value) => {
    setEditForm((current) => ({ ...current, [key]: value }))
  }

  const updatePasswordField = (key, value) => {
    setPasswordForm((current) => ({ ...current, [key]: value }))
  }

  const handleCreateUser = async (event) => {
    event.preventDefault()
    const result = await createUser(createForm)
    if (!result.ok) {
      setFeedback({ type: 'error', message: result.error })
      return
    }

    setCreateForm({
      name: '',
      username: '',
      password: '',
      confirmPassword: '',
      role: 'staff',
      notes: ''
    })
    setSelectedUserId(result.user.id)
    setFeedback({
      type: 'success',
      message: `${result.user.name} is ready to sign in as ${result.user.role}.`
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

    const result = await updateUserProfile(selectedUser.id, editForm)
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

    const result = await changeUserPassword(
      selectedUser.id,
      passwordForm.password,
      passwordForm.confirmPassword
    )
    if (!result.ok) {
      setFeedback({ type: 'error', message: result.error })
      return
    }

    setPasswordForm({ password: '', confirmPassword: '' })
    setFeedback({
      type: 'success',
      message: `Password updated for ${selectedUser.name}.`
    })
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="grid gap-5">
        <Card className="h-fit xl:h-full">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <UserRoundPlus size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-brand-700">Admin Control</p>
              <h2 className="text-2xl font-bold text-slate-950">Create User</h2>
            </div>
          </div>

          <form className="grid gap-4" onSubmit={handleCreateUser}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                id="user-name"
                label="Full Name"
                onChange={(event) => updateCreateField('name', event.target.value)}
                placeholder="Example: Rahim Uddin"
                value={createForm.name}
              />
              <Input
                id="user-username"
                label="Username"
                onChange={(event) => updateCreateField('username', event.target.value)}
                placeholder="example: rahim"
                value={createForm.username}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                id="user-password"
                label="Temporary Password"
                onChange={(event) => updateCreateField('password', event.target.value)}
                placeholder="Set a first password"
                type="text"
                value={createForm.password}
              />
              <Input
                id="user-confirm-password"
                label="Confirm Password"
                onChange={(event) => updateCreateField('confirmPassword', event.target.value)}
                placeholder="Repeat the password"
                type="text"
                value={createForm.confirmPassword}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)] md:items-start">
              <Select
                id="user-role"
                label="Access Role"
                onChange={(event) => updateCreateField('role', event.target.value)}
                selectClassName="min-h-12"
                value={createForm.role}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </Select>
              <TextArea
                className="h-full"
                id="user-notes"
                label="Notes"
                onChange={(event) => updateCreateField('notes', event.target.value)}
                placeholder="Optional note about this account"
                textAreaClassName="min-h-20"
                value={createForm.notes}
              />
            </div>

            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              New cloud accounts sign in with the username and password you set here.
            </p>

            <PasswordChecklist password={createForm.password} />

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

            <Button type="submit">Create User Account</Button>
          </form>
        </Card>

        <Card className="h-fit">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <PencilLine size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-brand-700">Account Details</p>
              <h2 className="text-2xl font-bold text-slate-950">Edit User</h2>
            </div>
          </div>

          {selectedUser ? (
            <div className="grid gap-5">
              <form className="grid gap-4" onSubmit={handleSaveProfile}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    id="edit-name"
                    label="Full Name"
                    onChange={(event) => updateEditField('name', event.target.value)}
                    value={editForm.name}
                  />
                  <Input
                    id="edit-username"
                    label="Username"
                    inputClassName="bg-slate-50 text-slate-500"
                    readOnly
                    onChange={(event) => updateEditField('username', event.target.value)}
                    value={editForm.username}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)] md:items-start">
                  <Select
                    id="edit-role"
                    label="Access Role"
                    onChange={(event) => updateEditField('role', event.target.value)}
                    selectClassName="min-h-12"
                    value={editForm.role}
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </Select>
                  <TextArea
                    className="h-full"
                    id="edit-notes"
                    label="Notes"
                    onChange={(event) => updateEditField('notes', event.target.value)}
                    textAreaClassName="min-h-20"
                    value={editForm.notes}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="submit">Save Profile</Button>
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
                    <Snowflake size={16} aria-hidden="true" />
                    {selectedUser.status === 'frozen' ? 'Unfreeze User' : 'Freeze User'}
                  </Button>
                  <Button
                    onClick={() => handleDeleteUser(selectedUser)}
                    type="button"
                    variant="secondary"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Delete User
                  </Button>
                </div>
              </form>

              <form className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4" onSubmit={handleResetPassword}>
                <div className="flex items-center gap-2">
                  <KeyRound size={18} className="text-brand-700" aria-hidden="true" />
                  <h3 className="text-lg font-bold text-slate-950">Reset Password</h3>
                </div>
                <p className="text-sm text-slate-500">
                  Cloud password reset for other users will be added in the next secure backend step.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    id="reset-password"
                    label="New Password"
                    onChange={(event) => updatePasswordField('password', event.target.value)}
                    type="text"
                    value={passwordForm.password}
                  />
                  <Input
                    id="reset-confirm-password"
                    label="Confirm New Password"
                    onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
                    type="text"
                    value={passwordForm.confirmPassword}
                  />
                </div>
                <PasswordChecklist password={passwordForm.password} />
                <Button disabled type="submit" variant="secondary">Update Password</Button>
              </form>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No user is available to edit yet.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-5">
        <Card className="xl:h-full">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-brand-700">Team Access</p>
              <h2 className="text-2xl font-bold text-slate-950">Users</h2>
            </div>
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
              {filteredUsers.length} shown
            </span>
          </div>

          <div className="mb-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_180px]">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Search
              <div className="flex min-h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3">
                <Search size={16} className="text-slate-400" aria-hidden="true" />
                <input
                  className="w-full border-0 bg-transparent p-0 text-base text-slate-900 outline-none"
                  onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                  placeholder="Search by name, username, or role"
                  type="text"
                  value={filters.query}
                />
              </div>
            </label>
            <Select
              id="filter-role"
              label="Role"
              onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}
              value={filters.role}
            >
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </Select>
            <Select
              id="filter-status"
              label="Status"
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              value={filters.status}
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="frozen">Frozen</option>
            </Select>
          </div>

          <div className="grid gap-4">
            {filteredUsers.map((user) => {
              const isFrozen = user.status === 'frozen'
              const isSelected = selectedUser?.id === user.id
              return (
                <div
                  className={`rounded-lg border p-4 transition ${
                    isSelected
                      ? 'border-brand-200 bg-brand-50/40'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                  key={user.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brand-700 shadow-soft">
                          {user.role === 'admin' ? (
                            <ShieldCheck size={18} aria-hidden="true" />
                          ) : (
                            <UserRound size={18} aria-hidden="true" />
                          )}
                        </span>
                        <div>
                          <p className="text-base font-bold text-slate-950">{user.name}</p>
                          <p className="text-sm text-slate-500">@{user.username}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200">
                          {user.role === 'admin' ? 'Admin' : 'Staff'}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 ${
                            isFrozen
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {isFrozen ? 'Frozen' : 'Active'}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-slate-500 ring-1 ring-slate-200">
                          Created by {user.createdBy || 'system'}
                        </span>
                      </div>

                      <div className="grid gap-1 text-sm text-slate-600">
                        <p>Created: {formatDateTime(user.createdAt)}</p>
                        <p>Last login: {formatDateTime(user.lastLoginAt)}</p>
                        {user.notes ? <p>Notes: {user.notes}</p> : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => setSelectedUserId(user.id)} type="button" variant={isSelected ? 'primary' : 'secondary'}>
                        <PencilLine size={16} aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleStatusChange(user.id, isFrozen ? 'active' : 'frozen')}
                        type="button"
                        variant={isFrozen ? 'primary' : 'secondary'}
                      >
                        <Snowflake size={16} aria-hidden="true" />
                        {isFrozen ? 'Unfreeze' : 'Freeze'}
                      </Button>
                      <Button
                        onClick={() => handleDeleteUser(user)}
                        type="button"
                        variant="secondary"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card>
          <div className="mb-4">
            <p className="text-sm font-semibold text-brand-700">Traceability</p>
            <h2 className="text-2xl font-bold text-slate-950">Recent Access Activity</h2>
          </div>

          <div className="grid gap-3">
            {recentActivity.map((log) => (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3" key={log.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-950">{log.action}</p>
                  <span className="text-xs font-semibold text-slate-500">
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{log.description}</p>
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
      </div>
    </div>
  )
}
