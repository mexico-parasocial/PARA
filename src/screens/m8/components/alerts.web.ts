/*
 * Web counterpart of `alerts.ts`: React Native web's `Alert.alert` is a no-op,
 * so a destructive action such as revoking a grant would silently never run.
 * The browser's own dialogs are blocking and accessible.
 */

export function confirmAction({
  title,
  message,
  onConfirm,
}: {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
}) {
  if (window.confirm(`${title}\n\n${message}`)) {
    onConfirm()
  }
}

export function showNotice(title: string, message: string) {
  window.alert(`${title}\n\n${message}`)
}
