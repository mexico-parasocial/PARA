import {useEffect, useRef, useState} from 'react'
import {Platform, Pressable, TextInput, View} from 'react-native'
import {useKeyboardHandler} from 'react-native-keyboard-controller'
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import {RichText as RichTextAPI} from '@atproto/api'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {type RouteProp, useRoute} from '@react-navigation/native'

import {useHideBottomBarBorderForScreen} from '#/lib/hooks/useHideBottomBarBorder'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {
  useAgentChatQuery,
  useSendAgentMessageMutation,
} from '#/state/queries/messages/agent-chat'
import {useShellLayout} from '#/state/shell/shell-layout'
import {atoms as a, useTheme} from '#/alf'
import {Macintosh_Stroke2_Corner2_Rounded as MacintoshIcon} from '#/components/icons/Macintosh'
import {PaperPlane_Stroke2_Corner0_Rounded as SendIcon} from '#/components/icons/PaperPlane'
import * as Layout from '#/components/Layout'
import {RichText} from '#/components/RichText'
import {Text} from '#/components/Typography'

const PROMPT_STARTERS = [
  'Resume los temas urgentes de esta comunidad.',
  'Ayúdame a convertir una queja en propuesta de cabildeo.',
  'Qué evidencia falta para tomar una buena decisión?',
  'Redacta una respuesta civil y breve para este debate.',
]

export function AgentChatScreen() {
  const t = useTheme()
  const route = useRoute<RouteProp<CommonNavigatorParams, 'AgentChat'>>()
  const {_} = useLingui()
  const {agentId} = route.params
  const {footerHeight} = useShellLayout()

  useHideBottomBarBorderForScreen()

  const [message, setMessage] = useState('')
  const scrollViewRef = useRef<Animated.ScrollView>(null)

  const {data: messages = [], isLoading} = useAgentChatQuery(agentId)
  const sendMutation = useSendAgentMessageMutation(agentId)

  const onSendMessage = () => {
    if (!message.trim() || sendMutation.isPending) return
    const text = message.trim()
    setMessage('')
    sendMutation.mutate(text)
  }

  const onSendPromptStarter = (text: string) => {
    if (sendMutation.isPending) return
    setMessage('')
    sendMutation.mutate(text)
  }

  // Scroll to bottom when messages change or loading finishes
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({animated: true})
  }, [messages.length, sendMutation.isPending])

  // Sticky footer logic derived from MessagesList.tsx
  const keyboardHeight = useSharedValue(0)
  useKeyboardHandler({
    onMove: e => {
      'worklet'
      keyboardHeight.set(e.height)
    },
    onEnd: e => {
      'worklet'
      keyboardHeight.set(e.height)
    },
  })

  const animatedStickyViewStyle = useAnimatedStyle(() => ({
    transform: [
      {translateY: -Math.max(keyboardHeight.get(), footerHeight.get())},
    ],
  }))

  const animatedListStyle = useAnimatedStyle(() => ({
    marginBottom: Math.max(keyboardHeight.get(), footerHeight.get()),
  }))

  return (
    <Layout.Screen testID="agentChatScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <View style={[a.flex_row, a.align_center, a.gap_md]}>
            <View
              style={[
                {width: 34, height: 34},
                a.rounded_full,
                a.justify_center,
                a.align_center,
                t.atoms.bg_contrast_25,
              ]}>
              <MacintoshIcon style={{color: t.palette.primary_500}} size="sm" />
            </View>
            <View>
              <Layout.Header.TitleText>{agentId}</Layout.Header.TitleText>
            </View>
          </View>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      <Layout.Center style={[a.flex_1]}>
        <Animated.ScrollView
          ref={scrollViewRef}
          style={[a.flex_1, animatedListStyle]}
          contentContainerStyle={[a.px_md, a.pt_md, {paddingBottom: 20}]}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({animated: true})
          }>
          {isLoading && messages.length === 0 && (
            <View style={[a.align_center, a.mt_xl]}>
              <ThinkingIndicator color={t.palette.contrast_600} />
            </View>
          )}

          {messages.length === 0 && !isLoading && (
            <View style={[a.mb_md, a.align_start]}>
              <View
                style={[
                  a.py_sm,
                  a.px_md,
                  {
                    backgroundColor: t.palette.contrast_50,
                    borderRadius: 17,
                    borderBottomLeftRadius: 2,
                    maxWidth: '85%',
                  },
                ]}>
                <RichText
                  value={
                    new RichTextAPI({
                      text: `Hola, soy ${agentId}. ¿En qué puedo ayudarte hoy?`,
                    })
                  }
                  style={a.text_md}
                />
              </View>
              <Text style={[a.text_xs, a.mt_2xs, t.atoms.text_contrast_medium]}>
                {new Date().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>

              <View style={[a.mt_md, a.gap_sm, {maxWidth: '92%'}]}>
                {PROMPT_STARTERS.map(starter => (
                  <Pressable
                    key={starter}
                    accessibilityRole="button"
                    accessibilityLabel={starter}
                    accessibilityHint="Envía esta pregunta al agente"
                    onPress={() => onSendPromptStarter(starter)}
                    disabled={sendMutation.isPending}
                    style={[
                      a.py_sm,
                      a.px_md,
                      {
                        borderWidth: 1,
                        borderColor: t.palette.contrast_200,
                        borderRadius: 16,
                        backgroundColor: t.palette.contrast_25,
                      },
                    ]}>
                    <Text style={[a.text_sm, t.atoms.text]}>{starter}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {messages.map(chatMessage => {
            const isFromSelf = chatMessage.sender === 'user'
            const rt = new RichTextAPI({text: chatMessage.text})
            const date = new Date(chatMessage.createdAt)

            return (
              <View
                key={chatMessage.id}
                style={[a.mb_md, isFromSelf ? a.align_end : a.align_start]}>
                <View
                  style={[
                    a.py_sm,
                    a.px_md,
                    {
                      backgroundColor: isFromSelf
                        ? t.palette.primary_500
                        : t.palette.contrast_50,
                      borderRadius: 17,
                      maxWidth: '85%',
                    },
                    isFromSelf
                      ? {borderBottomRightRadius: 2}
                      : {borderBottomLeftRadius: 2},
                  ]}>
                  <RichText
                    value={rt}
                    style={[a.text_md, isFromSelf && {color: t.palette.white}]}
                  />
                </View>
                <Text
                  style={[a.text_xs, a.mt_2xs, t.atoms.text_contrast_medium]}>
                  {date.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            )
          })}

          {sendMutation.isPending && (
            <View style={[a.mb_md, a.align_start]}>
              <View
                style={[
                  a.py_sm,
                  a.px_md,
                  {
                    backgroundColor: t.palette.contrast_50,
                    borderRadius: 17,
                    borderBottomLeftRadius: 2,
                  },
                ]}>
                <ThinkingIndicator color={t.palette.contrast_700} />
              </View>
            </View>
          )}

          {sendMutation.isError && (
            <View style={[a.mb_md, a.align_start]}>
              <View
                style={[
                  a.py_sm,
                  a.px_md,
                  {
                    backgroundColor: t.palette.negative_50,
                    borderRadius: 17,
                    borderBottomLeftRadius: 2,
                    maxWidth: '85%',
                  },
                ]}>
                <Text style={[a.text_sm, {color: t.palette.negative_500}]}>
                  No pude enviar el mensaje. Inténtalo de nuevo.
                </Text>
              </View>
            </View>
          )}
        </Animated.ScrollView>

        <Animated.View
          style={[
            a.px_md,
            a.pb_sm,
            a.pt_xs,
            t.atoms.bg,
            animatedStickyViewStyle,
            {
              borderTopWidth: 1,
              borderTopColor: t.palette.contrast_100,
            },
          ]}>
          <View
            style={[
              a.w_full,
              a.flex_row,
              t.atoms.bg_contrast_25,
              {
                padding: a.p_sm.padding - 2,
                paddingLeft: a.p_md.padding - 2,
                borderWidth: 1,
                borderRadius: 23,
                borderColor: 'transparent',
              },
            ]}>
            <TextInput
              accessibilityLabel="Text input field"
              accessibilityHint="Type your message to the AI agent"
              style={[
                a.flex_1,
                a.text_md,
                a.px_sm,
                t.atoms.text,
                {
                  maxHeight: 120,
                  paddingBottom: Platform.OS === 'ios' ? 5 : 0,
                },
              ]}
              placeholder={_(msg`Escribe un mensaje...`)}
              placeholderTextColor={t.palette.contrast_500}
              value={message}
              onChangeText={nextMessage => {
                if (sendMutation.isError) {
                  sendMutation.reset()
                }
                setMessage(nextMessage)
              }}
              multiline
              keyboardAppearance={t.scheme}
              editable={!sendMutation.isPending}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={_(msg`Send message`)}
              accessibilityHint="Sends your message to the AI agent"
              style={[
                a.rounded_full,
                a.align_center,
                a.justify_center,
                {
                  height: 30,
                  width: 30,
                  backgroundColor: sendMutation.isPending
                    ? t.palette.contrast_200
                    : t.palette.primary_500,
                },
              ]}
              onPress={onSendMessage}
              disabled={sendMutation.isPending}>
              <SendIcon
                fill={t.palette.white}
                style={[{position: 'relative', left: 1}]}
              />
            </Pressable>
          </View>
        </Animated.View>
      </Layout.Center>
    </Layout.Screen>
  )
}

function ThinkingIndicator({color}: {color: string}) {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.set(
      withRepeat(
        withTiming(1, {
          duration: 1400,
          easing: Easing.inOut(Easing.cubic),
        }),
        -1,
        true,
      ),
    )
  }, [progress])

  return (
    <View style={[a.flex_row, a.align_center]}>
      {'Pensando'.split('').map((letter, index) => (
        <ThinkingLetter
          key={`${letter}-${index}`}
          color={color}
          index={index}
          progress={progress}
          letter={letter}
        />
      ))}
    </View>
  )
}

function ThinkingLetter({
  color,
  index,
  letter,
  progress,
}: {
  color: string
  index: number
  letter: string
  progress: SharedValue<number>
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const center = index / 8
    const distance = Math.abs(progress.get() - center)
    return {
      opacity: interpolate(
        distance,
        [0, 0.35, 0.7],
        [1, 0.62, 0.36],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateY: interpolate(
            distance,
            [0, 0.5],
            [-1.5, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    }
  })

  return (
    <Animated.Text style={[a.text_sm, a.font_bold, {color}, animatedStyle]}>
      {letter}
    </Animated.Text>
  )
}
