import {useLingui} from '@lingui/react/macro'
import {
  HotkeysProvider,
  useHotkeys,
  useHotkeysContext,
} from 'react-hotkeys-hook'

import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {useDialogStateContext} from '#/state/dialogs'
import {emitFocusSearch} from '#/state/events'
import {useLightbox} from '#/state/lightbox'
import {useModals} from '#/state/modals'
import {useSession} from '#/state/session'
import {useIsDrawerOpen} from '#/state/shell/drawer-open'

enum Hotkeys {
  OPEN_COMPOSER = 'n',
  FOCUS_SEARCH = 'slash',
}

export {useHotkeysContext}

export function Provider({children}: React.PropsWithChildren<unknown>) {
  return (
    <HotkeysProvider initiallyActiveScopes={['global']}>
      <KeyboardShortcuts>{children}</KeyboardShortcuts>
    </HotkeysProvider>
  )
}

function KeyboardShortcuts({children}: React.PropsWithChildren<unknown>) {
  useKeyboardShortcuts()
  return children
}

function useKeyboardShortcuts() {
  const {openComposer} = useOpenComposer()
  const {openDialogs} = useDialogStateContext()
  const {activeLightbox} = useLightbox()
  const {isModalActive} = useModals()
  const {hasSession} = useSession()
  const isDrawerOpen = useIsDrawerOpen()
  const {t: l} = useLingui()

  const shouldIgnore = (requiresSession = false) => {
    if (requiresSession && !hasSession) {
      return true
    }

    return (
      openDialogs.current.size > 0 ||
      isModalActive ||
      Boolean(activeLightbox) ||
      isDrawerOpen
    )
  }

  const handleKey = (
    callback: () => void,
    options?: {requiresSession?: boolean},
  ) => {
    if (shouldIgnore(options?.requiresSession)) {
      return
    }

    callback()
  }

  useHotkeys(
    Hotkeys.OPEN_COMPOSER,
    () =>
      handleKey(
        () => {
          openComposer({logContext: 'Other'})
        },
        {requiresSession: true},
      ),
    {scopes: ['global'], description: l`Compose new post`},
    [openComposer, hasSession, isModalActive, activeLightbox, isDrawerOpen],
  )

  useHotkeys(
    Hotkeys.FOCUS_SEARCH,
    () => handleKey(emitFocusSearch),
    {
      scopes: ['global'],
      preventDefault: true,
      description: l`Focus the search field`,
      useKey: true,
    },
    [hasSession, isModalActive, activeLightbox, isDrawerOpen],
  )
}
