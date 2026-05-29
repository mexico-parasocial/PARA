import { useState } from 'react'
import { View, TouchableOpacity, TextInput } from 'react-native'
import { Trans } from '@lingui/react/macro'
import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import { useTheme } from '#/alf'
import { Text } from '#/components/Typography'
import { useCreateRepresentativeNominationMutation, useRepresentativeNominationsQuery } from '#/state/queries/representative-participation'
import { useSession } from '#/state/session'
import * as Toast from '#/components/Toast'

export function CabildeoNominationSection({ cabildeoUri }: { cabildeoUri: string }) {
  const t = useTheme()
  const { _ } = useLingui()
  const { currentAccount } = useSession()
  const { data: nominations = [] } = useRepresentativeNominationsQuery(cabildeoUri, currentAccount?.did)
  const createNomination = useCreateRepresentativeNominationMutation()
  
  const [handle, setHandle] = useState('')
  const [role, setRole] = useState<'organize' | 'finance' | 'execute' | null>(null)

  const handleNominate = () => {
    if (!handle.trim() || !role || !currentAccount?.did) return
    createNomination.mutate({
      representativeId: cabildeoUri,
      mode: 'public',
      nominatorDid: currentAccount.did,
      nomineeHandle: handle.trim(),
      reason: role === 'organize' ? 'Organizar' : role === 'finance' ? 'Financiar' : 'Ejecutar',
    }, {
      onSuccess: () => {
        setHandle('')
        setRole(null)
        Toast.show(_(msg`Nominación enviada`))
      }
    })
  }

  return (
    <View style={[styles.nominationSection, t.atoms.bg_contrast_25]}>
      <Text style={[styles.sectionTitle, t.atoms.text]}>
        <Trans>Nominaciones para ejecución</Trans>
      </Text>
      <Text style={[styles.nominationDesc, t.atoms.text_contrast_medium]}>
        <Trans>El cabildeo ha sido resuelto. Propón a personas u organizaciones para llevar a cabo la solución.</Trans>
      </Text>

      <View style={styles.nominateForm}>
        <TextInput
          style={[styles.nominateInput, t.atoms.bg_contrast_50, t.atoms.text, { borderColor: t.palette.contrast_200 }]}
          placeholder={_(msg`Handle (ej. @usuario.para.social)`)}
          placeholderTextColor={t.palette.contrast_400}
          value={handle}
          onChangeText={setHandle}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.roleButtons}>
          {(['organize', 'finance', 'execute'] as const).map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => setRole(r)}
              style={[
                styles.roleBtn,
                role === r ? { backgroundColor: t.palette.primary_500 } : t.atoms.bg_contrast_50,
              ]}>
              <Text style={[styles.roleBtnText, role === r ? { color: t.palette.contrast_100 } : t.atoms.text_contrast_medium]}>
                {r === 'organize' ? 'Organizar' : r === 'finance' ? 'Financiar' : 'Ejecutar'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          disabled={!handle.trim() || !role || createNomination.isPending}
          onPress={handleNominate}
          style={[
            styles.submitNominationBtn,
            (!handle.trim() || !role) ? { backgroundColor: t.palette.contrast_200 } : { backgroundColor: t.palette.primary_500 }
          ]}>
          <Text style={[styles.submitNominationText, { color: t.palette.contrast_100 }]}>
            {createNomination.isPending ? 'Enviando...' : 'Nominar'}
          </Text>
        </TouchableOpacity>
      </View>

      {nominations.length > 0 && (
        <View style={styles.nominationsList}>
          {nominations.map(nom => (
            <View key={nom.id} style={[styles.nominationCard, t.atoms.bg_contrast_50]}>
              <Text style={[styles.nomineeName, t.atoms.text]}>{nom.nomineeHandle}</Text>
              <View style={[styles.roleTag, { backgroundColor: t.palette.primary_500 + '20' }]}>
                <Text style={[styles.roleTagText, { color: t.palette.primary_500 }]}>{nom.reason}</Text>
              </View>
              <Text style={[styles.supportCount, t.atoms.text_contrast_medium]}>{nom.supportCount} apoyos</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
