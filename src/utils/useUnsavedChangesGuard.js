import { unstable_usePrompt, useBeforeUnload } from 'react-router'

export function useUnsavedChangesGuard(when, message = 'You have unsaved changes. Leave this page?') {
  useBeforeUnload((event) => {
    if (!when) return
    event.preventDefault()
    event.returnValue = ''
  })

  unstable_usePrompt({
    when,
    message
  })
}
