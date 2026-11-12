import {StyleSheet, View} from 'react-native'

import {
  type CommunityGovernanceView,
  type CommunityRoleDefinition,
  type CommunityRoleHolder,
} from '#/lib/community-governance'
import {useProfilesQuery} from '#/state/queries/profile'
import {useTheme} from '#/alf'
import {Text} from '#/components/Typography'

const ROLE_ORDER = ['owner', 'moderator'] as const

const ROLE_LABELS: Record<string, string> = {
  visitor: 'Visitante',
  member: 'Integrante',
  moderator: 'Moderación',
  owner: 'Titular',
  assembly: 'Asamblea',
}

const ADMISSION_LABELS: Record<
  NonNullable<CommunityGovernanceView['admissionMode']>,
  string
> = {
  open: 'Admisión abierta: cualquier persona puede entrar.',
  assembly_approval: 'Admisión por asamblea: las nuevas personas se votan.',
}

export function roleLabel(role: string) {
  return ROLE_LABELS[role] ?? role
}

/** Holders of one role, soonest-expiring last so permanent offices lead. */
export function holdersOf(
  holders: ReadonlyArray<CommunityRoleHolder>,
  role: string,
  now: Date = new Date(),
) {
  return holders
    .filter(
      holder =>
        holder.role === role &&
        (!holder.expiresAt || new Date(holder.expiresAt) > now),
    )
    .sort(
      (a, b) =>
        (a.expiresAt ?? '9999').localeCompare(b.expiresAt ?? '9999') * -1 ||
        a.did.localeCompare(b.did),
    )
}

/**
 * Who holds office in this community, as the AppView verified it from
 * authority events, and what each role is for. The governance record's own
 * moderator list (shown further down) does not appear here: any account can
 * publish one under any community's name.
 */
export function VerifiedRolesSection({
  governance,
}: {
  governance: CommunityGovernanceView
}) {
  const t = useTheme()
  const holders = governance.roleHolders ?? []
  const dids = Array.from(new Set(holders.map(holder => holder.did)))
  const {data} = useProfilesQuery({handles: dids})
  const handleOf = new Map<string, string>(
    (data?.profiles ?? []).map(profile => [profile.did, profile.handle]),
  )
  const definitions = governance.roleDefinitions ?? []

  return (
    <View style={styles.section}>
      <Text style={[styles.title, t.atoms.text]}>Cargos verificados</Text>
      <Text style={[styles.note, t.atoms.text_contrast_medium]}>
        Quien figura aquí lo confirmó el servidor a partir de eventos de
        autoridad. Un cargo escrito por la propia persona no cuenta.
      </Text>
      {governance.admissionMode ? (
        <Text style={[styles.note, t.atoms.text_contrast_medium]}>
          {ADMISSION_LABELS[governance.admissionMode]}
        </Text>
      ) : null}

      {ROLE_ORDER.map(role => {
        const list = holdersOf(holders, role)
        return (
          <View key={role} style={styles.group}>
            <Text style={[styles.groupTitle, t.atoms.text]}>
              {roleLabel(role)}
            </Text>
            {list.length === 0 ? (
              <Text style={[styles.note, t.atoms.text_contrast_medium]}>
                {role === 'owner'
                  ? 'Esta comunidad no tiene titular.'
                  : 'Sin personas en este cargo.'}
              </Text>
            ) : (
              list.map(holder => (
                <View key={`${role}:${holder.did}`} style={styles.row}>
                  <Text style={[styles.holder, t.atoms.text]} numberOfLines={1}>
                    {handleOf.get(holder.did)
                      ? `@${handleOf.get(holder.did)}`
                      : holder.did}
                  </Text>
                  <Text style={[styles.note, t.atoms.text_contrast_medium]}>
                    {holder.expiresAt
                      ? `Vence ${holder.expiresAt.slice(0, 10)}`
                      : 'Sin vencimiento'}
                  </Text>
                </View>
              ))
            )}
          </View>
        )
      })}

      {definitions.length > 0 ? (
        <View style={styles.group}>
          <Text style={[styles.groupTitle, t.atoms.text]}>
            Qué hace cada rol
          </Text>
          {definitions.map(definition => (
            <RoleDefinition key={definition.role} definition={definition} />
          ))}
        </View>
      ) : null}
    </View>
  )
}

function RoleDefinition({definition}: {definition: CommunityRoleDefinition}) {
  const t = useTheme()
  return (
    <View style={styles.definition}>
      <Text style={[styles.holder, t.atoms.text]}>
        {roleLabel(definition.role)}
      </Text>
      {definition.howToObtain ? (
        <Text style={[styles.note, t.atoms.text_contrast_medium]}>
          Cómo se obtiene: {definition.howToObtain}
        </Text>
      ) : null}
      {definition.responsibilities.map(item => (
        <Text key={item} style={[styles.note, t.atoms.text_contrast_medium]}>
          • {item}
        </Text>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {gap: 8, marginBottom: 20},
  title: {fontSize: 17, fontWeight: '700'},
  groupTitle: {fontSize: 14, fontWeight: '700'},
  group: {gap: 6, marginTop: 8},
  row: {gap: 2},
  holder: {fontSize: 14, fontWeight: '600'},
  note: {fontSize: 13, lineHeight: 18},
  definition: {gap: 2, marginTop: 4},
})
