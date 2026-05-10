import { useBeforeUnload } from 'react-router'

export function useUnsavedChangesGuard(when) {
  useBeforeUnload((event) => {
    if (!when) return
    event.preventDefault()
    event.returnValue = ''
  })
}
