import {
  type ComponentType,
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
} from 'react'
import {type GestureResponderEvent, View} from 'react-native'
import {useLingui} from '@lingui/react/macro'

import {
  atoms as a,
  useBreakpoints,
  useTheme,
  type ViewStyleProp,
  web,
} from '#/alf'
import {
  Button,
  type ButtonColor,
  ButtonIcon,
  ButtonText,
} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {type Props as SVGIconProps} from '#/components/icons/common'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {type BottomSheetViewProps} from '../../modules/bottom-sheet'

export {
  type DialogControlProps as PromptControlProps,
  useDialogControl as usePromptControl,
} from '#/components/Dialog'

const Context = createContext<{
  titleId: string
  descriptionId: string
}>({
  titleId: '',
  descriptionId: '',
})
Context.displayName = 'PromptContext'

export function Outer({
  children,
  control,
  testID,
  nativeOptions,
  webOptions,
}: React.PropsWithChildren<{
  control: Dialog.DialogControlProps
  testID?: string
  nativeOptions?: Omit<BottomSheetViewProps, 'children'>
  webOptions?: Record<string, unknown>
}>) {
  const titleId = useId()
  const descriptionId = useId()

  const context = useMemo(
    () => ({titleId, descriptionId}),
    [titleId, descriptionId],
  )

  return (
    <Dialog.Outer
      control={control}
      testID={testID}
      webOptions={webOptions || {alignCenter: true}}
      nativeOptions={{preventExpansion: true, ...nativeOptions}}>
      <Dialog.Handle />
      <Context.Provider value={context}>{children}</Context.Provider>
    </Dialog.Outer>
  )
}

export function Content({children}: React.PropsWithChildren<{}>) {
  const {titleId, descriptionId} = useContext(Context)
  return (
    <Dialog.ScrollableInner
      accessibilityLabelledBy={titleId}
      accessibilityDescribedBy={descriptionId}
      style={web({maxWidth: 400})}>
      {children}
    </Dialog.ScrollableInner>
  )
}

export function TitleText({
  children,
  style,
}: React.PropsWithChildren<ViewStyleProp>) {
  const {titleId} = useContext(Context)
  return (
    <Text
      nativeID={titleId}
      style={[
        a.flex_1,
        a.text_2xl,
        a.font_semi_bold,
        a.pb_sm,
        a.leading_snug,
        style,
      ]}>
      {children}
    </Text>
  )
}

export function DescriptionText({
  children,
  selectable,
}: React.PropsWithChildren<{selectable?: boolean}>) {
  const t = useTheme()
  const {descriptionId} = useContext(Context)
  return (
    <Text
      nativeID={descriptionId}
      selectable={selectable}
      style={[a.text_md, a.leading_snug, t.atoms.text_contrast_high, a.pb_lg]}>
      {children}
    </Text>
  )
}

export function Actions({children}: React.PropsWithChildren<{}>) {
  const {gtMobile} = useBreakpoints()

  return (
    <View
      style={[
        a.w_full,
        a.gap_md,
        a.justify_end,
        gtMobile
          ? [a.flex_row, a.flex_row_reverse, a.justify_start]
          : [a.flex_col],
      ]}>
      {children}
    </View>
  )
}

export function Cancel({
  cta,
  disabled,
}: {
  /**
   * Optional i18n string. If undefined, it will default to "Cancel".
   */
  cta?: string
  disabled?: boolean
}) {
  const {t: l} = useLingui()
  const {gtMobile} = useBreakpoints()
  const {close} = Dialog.useDialogContext()
  const onPress = useCallback(() => {
    close()
  }, [close])

  return (
    <Button
      variant="solid"
      color="secondary"
      size={gtMobile ? 'small' : 'large'}
      label={cta || l`Cancel`}
      onPress={onPress}
      disabled={disabled}>
      <ButtonText>{cta || l`Cancel`}</ButtonText>
    </Button>
  )
}

export function Action({
  onPress,
  color = 'primary',
  cta,
  testID,
  disabled,
  icon,
  shouldCloseOnPress = true,
  isPending,
}: {
  /**
   * Callback to run when the action is pressed. The method is called _after_
   * the dialog closes.
   *
   * Note: The dialog will close automatically when the action is pressed, you
   * should NOT close the dialog as a side effect of this method.
   */
  onPress: (e: GestureResponderEvent) => void
  color?: ButtonColor
  /**
   * Optional i18n string. If undefined, it will default to "Confirm".
   */
  cta?: string
  testID?: string
  disabled?: boolean
  icon?: ComponentType<SVGIconProps>
  shouldCloseOnPress?: boolean
  isPending?: boolean
}) {
  const {t: l} = useLingui()
  const {gtMobile} = useBreakpoints()
  const {close} = Dialog.useDialogContext()
  const handleOnPress = useCallback(
    (e: GestureResponderEvent) => {
      if (shouldCloseOnPress) {
        close(() => onPress?.(e))
      } else {
        onPress?.(e)
      }
    },
    [close, onPress, shouldCloseOnPress],
  )

  return (
    <Button
      variant="solid"
      color={color}
      size={gtMobile ? 'small' : 'large'}
      label={cta || l`Confirm`}
      onPress={handleOnPress}
      disabled={disabled || isPending}
      testID={testID}>
      {isPending ? (
        <Loader size="md" />
      ) : (
        <>
          {icon ? <ButtonIcon icon={icon} /> : null}
      <ButtonText>{cta || l`Confirm`}</ButtonText>
        </>
      )}
    </Button>
  )
}

export function Basic({
  control,
  title,
  description,
  cancelButtonCta,
  confirmButtonCta,
  onConfirm,
  confirmButtonColor,
  showCancel = true,
  isPending,
}: React.PropsWithChildren<{
  control: Dialog.DialogOuterProps['control']
  title: string
  description?: string
  cancelButtonCta?: string
  confirmButtonCta?: string
  onConfirm: (e: GestureResponderEvent) => void
  confirmButtonColor?: ButtonColor
  showCancel?: boolean
  isPending?: boolean
}>) {
  return (
    <Outer control={control} testID="confirmModal">
      <Content>
        <TitleText>{title}</TitleText>
        {description && <DescriptionText>{description}</DescriptionText>}
        <Actions>
          <Action
            cta={confirmButtonCta}
            onPress={onConfirm}
            color={confirmButtonColor}
            testID="confirmBtn"
            isPending={isPending}
          />
          {showCancel && <Cancel cta={cancelButtonCta} disabled={isPending} />}
        </Actions>
      </Content>
    </Outer>
  )
}
