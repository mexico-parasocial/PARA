import {Alert} from 'react-native'

/*
 * Confirmation and notice helpers for the Identity & Wallet screens.
 * `Alert.alert` does nothing on web, so those screens import these instead and
 * the bundler picks `alerts.web.ts` there.
 */

export function confirmAction({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
}: {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
}) {
  Alert.alert(title, message, [
    {text: cancelLabel, style: 'cancel'},
    {text: confirmLabel, style: 'destructive', onPress: onConfirm},
  ])
}

export function showNotice(title: string, message: string) {
  Alert.alert(title, message)
}
