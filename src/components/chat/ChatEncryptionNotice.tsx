import {StyleSheet, View} from 'react-native'

import {atoms as a, useTheme} from '#/alf'
import {Button} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Unlock_Stroke2_Corner2_Rounded as UnlockIcon} from '#/components/icons/Lock'
import {Text} from '#/components/Typography'

/**
 * How a chat surface protects message content.
 *
 * `unencrypted` — the homeserver stores and can read message plaintext.
 * `e2ee` — content keys never leave verified devices.
 *
 * Deliberately has no "unknown" member: a surface that cannot prove it is
 * encrypted must pass `unencrypted` and show the disclosure. Failing closed is
 * the point — an absent notice reads to a user as "this is private".
 */
export type ChatEncryptionPolicy = 'unencrypted' | 'e2ee'

/**
 * Gate D (QUARTER_PLAN_2026Q4.md, risk R8): community chat is not end-to-end
 * encrypted, and nothing in the chat UI said so. The identity pill beside this
 * one talks about pseudonymity, which is easy to read as confidentiality.
 *
 * This notice is not dismissable. It states what the operator can see, and
 * `Más información` splits the hard guarantees (enforced in the Synapse
 * hardening overlay) from what is merely not attempted.
 */
export function ChatEncryptionNotice({
  policy = 'unencrypted',
}: {
  policy?: ChatEncryptionPolicy
}) {
  const t = useTheme()
  const control = Dialog.useDialogControl()

  if (policy === 'e2ee') return null

  return (
    <>
      <View
        accessibilityRole="alert"
        accessibilityLabel="Estos mensajes no tienen cifrado de extremo a extremo. Quien opera el servidor puede leerlos."
        accessibilityHint="Abre Más información para ver qué protege y qué no protege este chat."
        style={[
          styles.container,
          a.flex_row,
          a.align_center,
          a.gap_sm,
          {
            backgroundColor: t.palette.negative_500 + '10',
            borderColor: t.palette.negative_500 + '2A',
          },
        ]}>
        <UnlockIcon size="xs" style={{color: t.palette.negative_500}} />
        <View style={[a.flex_1]}>
          <Text
            style={[a.text_xs, a.font_bold, {color: t.palette.negative_500}]}>
            Sin cifrado de extremo a extremo
          </Text>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            Quien opera el servidor puede leer estos mensajes.
          </Text>
        </View>
        <Button
          variant="ghost"
          color="secondary"
          size="tiny"
          label="Más información sobre el cifrado en este chat"
          onPress={() => control.open()}>
          <Text style={[a.text_xs, a.font_semi_bold, t.atoms.text]}>
            Más información
          </Text>
        </Button>
      </View>

      <Dialog.Outer control={control}>
        <Dialog.Handle />
        <Dialog.ScrollableInner label="Privacidad de este chat">
          <View style={[a.gap_md, a.pb_lg]}>
            <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
              Privacidad de este chat
            </Text>

            <Text style={[a.text_sm, t.atoms.text_contrast_high]}>
              Los mensajes de la comunidad se guardan en claro en el servidor.
              No hay cifrado de extremo a extremo todavía.
            </Text>

            <Section title="LO QUE SÍ ESTÁ PROTEGIDO">
              <BulletText>
                El servidor no federa: no envía estas conversaciones a otros
                servidores Matrix.
              </BulletText>
              <BulletText>
                Las salas son privadas y por invitación; el directorio de salas
                no es público ni legible sin autenticación.
              </BulletText>
              <BulletText>
                Tu identidad de voto nunca se usa en el chat. Aquí participas
                con tu pseudónimo cívico.
              </BulletText>
              <BulletText>
                El tránsito va cifrado entre tu dispositivo y el servidor (TLS).
              </BulletText>
            </Section>

            <Section title="LO QUE NO ESTÁ PROTEGIDO">
              <BulletText>
                Quien administra el servidor puede leer el contenido de los
                mensajes y de los archivos que envíes.
              </BulletText>
              <BulletText>
                El contenido queda en los respaldos del servidor y en los
                registros de moderación.
              </BulletText>
              <BulletText>
                Las herramientas de resumen e inteligencia artificial procesan
                el texto que les pases.
              </BulletText>
            </Section>

            <Text
              style={[
                a.text_sm,
                a.font_semi_bold,
                {color: t.palette.negative_500},
              ]}>
              No compartas aquí contraseñas, frases de recuperación ni nada que
              no quieras que lea quien administra el servidor.
            </Text>
          </View>
        </Dialog.ScrollableInner>
      </Dialog.Outer>
    </>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const t = useTheme()
  return (
    <View style={[a.gap_xs]}>
      <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
        {title}
      </Text>
      {children}
    </View>
  )
}

function BulletText({children}: {children: React.ReactNode}) {
  const t = useTheme()
  return (
    <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_high]}>
      {'· '}
      {children}
    </Text>
  )
}

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
})
