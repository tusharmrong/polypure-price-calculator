import { useEffect } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'

export function useUnsavedChangesGuard(when, message = 'You have unsaved changes. Leave this page?') {
  useBeforeUnload((event) => {
    if (!when) return
    event.preventDefault()
    event.returnValue = ''
  })

  const blocker = useBlocker(when)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    const shouldLeave = window.confirm(message)
    if (shouldLeave) blocker.proceed()
    else blocker.reset()
  }, [blocker, message])
}
