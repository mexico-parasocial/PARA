import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {HITSLOP_10} from '#/lib/constants'
import {useHaptics} from '#/lib/haptics'
import {useTotalChatUnread} from '#/state/chat/useTotalChatUnread'
import {useUpdateAllRead} from '#/state/queries/messages/update-all-read'
import {atoms as a, useTheme} from '#/alf'
import {ButtonIcon} from '#/components/Button'
import {CircleCheck_Stroke2_Corner0_Rounded as CircleCheckIcon} from '#/components/icons/CircleCheck'
import {Inbox_Stroke2_Corner2_Rounded as InboxIcon} from '#/components/icons/Inbox'
import {Message_Stroke2_Corner0_Rounded as MessageIcon} from '#/components/icons/Message'
import {BUTTON_VISUAL_ALIGNMENT_OFFSET} from '#/components/Layout/const'
import {Link} from '#/components/Link'
import * as Menu from '#/components/Menu'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {useAgeAssurance} from '#/ageAssurance'
import {useAnalytics} from '#/analytics'

/**
 * Chat entry point for the Home top bar (native + web). Chat used to be a
 * bottom-bar tab; that slot now belongs to Data.
 */
export function HomeHeaderChatButton({
  alignToEdge,
}: {
  /** Pull the icon's visual edge flush with the header gutter. */
  alignToEdge?: boolean
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const ax = useAnalytics()
  const aa = useAgeAssurance()
  const playHaptic = useHaptics()
  const unread = useTotalChatUnread()
  const menuControl = Menu.useMenuControl()

  const showUnread = !aa.flags.chatDisabled
  const count = showUnread ? unread.numUnread : undefined
  const hasNew = showUnread && unread.hasNew

  return (
    <>
      <MessagesTabMenu control={menuControl} />
      <View>
        <Link
          testID="viewHeaderHomeChatBtn"
          to="/messages"
          hitSlop={HITSLOP_10}
          label={l`Chat`}
          size="small"
          variant="ghost"
          color="secondary"
          shape="square"
          onPress={() => {
            ax.metric('nav:click', {item: 'chat', surface: 'topBar'})
          }}
          onLongPress={() => {
            if (aa.flags.chatDisabled) return false
            playHaptic()
            menuControl.open()
            return false
          }}
          style={[
            a.justify_center,
            a.bg_transparent,
            alignToEdge && {marginRight: -BUTTON_VISUAL_ALIGNMENT_OFFSET},
          ]}>
          <ButtonIcon icon={MessageIcon} size="lg" />
        </Link>
        {count ? (
          <View
            pointerEvents="none"
            style={[
              a.absolute,
              a.rounded_full,
              a.align_center,
              a.justify_center,
              {
                top: 0,
                right: 0,
                minWidth: 16,
                height: 16,
                paddingHorizontal: 4,
                backgroundColor: t.palette.primary_500,
              },
            ]}>
            <Text
              maxFontSizeMultiplier={1.5}
              style={[
                a.font_semi_bold,
                {fontSize: 10, lineHeight: 12, color: 'white'},
              ]}>
              {count}
            </Text>
          </View>
        ) : hasNew ? (
          <View
            pointerEvents="none"
            style={[
              a.absolute,
              a.rounded_full,
              {
                top: 4,
                right: 4,
                width: 8,
                height: 8,
                backgroundColor: t.palette.primary_500,
              },
            ]}
          />
        ) : null}
      </View>
    </>
  )
}

function MessagesTabMenu({control}: {control: Menu.MenuControlProps}) {
  const {t: l} = useLingui()

  const {mutate: markAllChatsRead} = useUpdateAllRead('accepted', {
    onMutate: () => {
      Toast.show(l`Marked all chats as read`, {type: 'success'})
    },
    onError: () => {
      Toast.show(l`Failed to mark all chats as read`, {type: 'error'})
    },
  })

  const {mutate: markAllRequestsRead} = useUpdateAllRead('request', {
    onMutate: () => {
      Toast.show(l`Marked all requests as read`, {type: 'success'})
    },
    onError: () => {
      Toast.show(l`Failed to mark all requests as read`, {type: 'error'})
    },
  })

  return (
    <Menu.Root control={control}>
      <Menu.Outer showCancel>
        <Menu.Group>
          <Menu.Item
            label={l`Mark all chats as read`}
            onPress={() => markAllChatsRead()}>
            <Menu.ItemIcon icon={CircleCheckIcon} />
            <Menu.ItemText>
              <Trans>Mark all chats as read</Trans>
            </Menu.ItemText>
          </Menu.Item>
          <Menu.Item
            label={l`Mark all requests as read`}
            onPress={() => markAllRequestsRead()}>
            <Menu.ItemIcon icon={InboxIcon} />
            <Menu.ItemText>
              <Trans>Mark all requests as read</Trans>
            </Menu.ItemText>
          </Menu.Item>
        </Menu.Group>
      </Menu.Outer>
    </Menu.Root>
  )
}
