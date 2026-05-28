import {useState} from 'react'
import {ScrollView, TouchableOpacity, View} from 'react-native'
import {useNavigation} from '@react-navigation/native'

import {type NavigationProp} from '#/lib/routes/types'
import {atoms as a, useTheme} from '#/alf'
import {
  ChevronBottom_Stroke2_Corner0_Rounded as ChevronBottom,
  ChevronTop_Stroke2_Corner0_Rounded as ChevronTop,
} from '#/components/icons/Chevron'
import {Macintosh_Stroke2_Corner2_Rounded as MacintoshIcon} from '#/components/icons/Macintosh'
import {Text} from '#/components/Typography'

const AGENTS = [
  {id: '1', name: 'Xavier Exul', color: '#5B2FA1'},
  {id: '2', name: 'Antigravity', color: '#007AFF'},
  {id: '3', name: 'Compañero', color: '#FF3B30'},
]

export function AgentSelection() {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const [isMinimized, setIsMinimized] = useState(false)

  return (
    <View
      style={[
        a.py_sm,
        {
          borderBottomWidth: 1,
          borderBottomColor: t.palette.contrast_100,
        },
      ]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={
          isMinimized ? 'Expandir agentes' : 'Minimizar agentes'
        }
        accessibilityHint={
          isMinimized
            ? 'Muestra la lista de agentes disponibles'
            : 'Oculta la lista de agentes'
        }
        activeOpacity={0.7}
        onPress={() => setIsMinimized(!isMinimized)}
        style={[
          a.flex_row,
          a.align_center,
          a.justify_between,
          a.px_md,
          a.mb_xs,
        ]}>
        <Text
          style={[
            a.text_xs,
            a.font_bold,
            t.atoms.text_contrast_medium,
            {textTransform: 'uppercase', letterSpacing: 0.5},
          ]}>
          Agentes
        </Text>
        <View style={[a.flex_row, a.align_center, a.gap_xs]}>
          {isMinimized && (
            <View style={[a.flex_row, a.gap_2xs, a.mr_sm]}>
              {AGENTS.map(agent => (
                <View
                  key={agent.id}
                  style={[
                    {width: 8, height: 8, borderRadius: 4},
                    {backgroundColor: agent.color},
                  ]}
                />
              ))}
            </View>
          )}
          {isMinimized ? (
            <ChevronBottom size="xs" style={t.atoms.text_contrast_medium} />
          ) : (
            <ChevronTop size="xs" style={t.atoms.text_contrast_medium} />
          )}
        </View>
      </TouchableOpacity>
      {!isMinimized && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[a.px_md, a.pt_xs]}>
          {AGENTS.map(agent => (
            <TouchableOpacity
              key={agent.id}
              accessibilityRole="button"
              accessibilityLabel={`Abrir chat con ${agent.name}`}
              accessibilityHint="Inicia una conversación con este agente"
              activeOpacity={0.7}
              style={[a.align_center, {width: 60, marginRight: 12}]}
              onPress={() =>
                navigation.navigate('AgentChat', {agentId: agent.name})
              }>
              <View
                style={[
                  {width: 42, height: 42, borderRadius: 21},
                  a.justify_center,
                  a.align_center,
                  a.mb_xs,
                  {
                    backgroundColor: agent.color + '30',
                  },
                ]}>
                <MacintoshIcon style={{color: agent.color}} size="lg" />
              </View>
              <Text
                numberOfLines={1}
                style={[
                  {fontSize: 10},
                  a.text_center,
                  t.atoms.text_contrast_medium,
                ]}>
                {agent.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )
}
