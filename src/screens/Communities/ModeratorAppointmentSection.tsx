import {useState} from 'react'
import {StyleSheet, TextInput, TouchableOpacity, View} from 'react-native'

import {
  type CommunityGovernanceView,
  type CommunityRoleHolder,
  type CommunityRoleOffer,
  holdsVerifiedRole,
} from '#/lib/community-governance'
import {
  incomingOffers,
  offerCandidates,
  outgoingOffers,
} from '#/lib/community-roles'
import {
  type CommunityMemberView,
  useCommunityBoardQuery,
  useCommunityMembersQuery,
} from '#/state/queries/community-boards'
import {
  useCommunityOpenOffersQuery,
  useCommunityRoleActions,
} from '#/state/queries/community-roles'
import {useTheme} from '#/alf'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e))

/**
 * Appointing a moderator takes consent: the owner offers and the person
 * accepts, which makes them a moderator. This shows each person the step that
 * is theirs. The community's host decides every action, so a button here only
 * asks.
 */
export function ModeratorAppointmentSection({
  governance,
  communityName,
  communityId,
}: {
  governance: CommunityGovernanceView
  communityName: string
  communityId?: string
}) {
  const t = useTheme()
  const board = useCommunityBoardQuery({communityId})
  const actions = useCommunityRoleActions({
    communityName,
    communityId,
    boardUri: board.data?.board.uri,
  })
  const {viewerDid} = actions
  const holders = governance.roleHolders ?? []
  const {data: offers = []} = useCommunityOpenOffersQuery(board.data?.board.uri)
  const isOwner = holdsVerifiedRole(governance, viewerDid, ['owner'])
  const myModeratorRole = holders.find(
    holder => holder.did === viewerDid && holder.role === 'moderator',
  )
  const incoming = incomingOffers(offers, viewerDid)
  const outgoing = outgoingOffers(offers, viewerDid)
  const moderators = holders.filter(holder => holder.role === 'moderator')

  const run = (
    mutation: {mutate: (arg: any, opts?: any) => void},
    arg: unknown,
    done: string,
  ) =>
    mutation.mutate(arg, {
      onSuccess: () => Toast.show(done),
      onError: (e: unknown) => Toast.show(errorText(e)),
    })

  if (!viewerDid) return null
  if (
    !isOwner &&
    !myModeratorRole &&
    incoming.length === 0 &&
    outgoing.length === 0
  ) {
    return null
  }

  return (
    <View style={[styles.card, t.atoms.bg_contrast_25]}>
      <Text style={[styles.title, t.atoms.text]}>
        Nombramiento de moderación
      </Text>

      {incoming.map(offer => (
        <View key={offer.seq} style={styles.block}>
          <Text style={[styles.body, t.atoms.text]}>
            El titular te ofreció ser moderador. Si aceptas, el cargo es tuyo de
            inmediato; puedes renunciar cuando quieras.
          </Text>
          <Action
            label="Aceptar el cargo"
            busy={actions.accept.isPending}
            onPress={() => run(actions.accept, offer, 'Ahora eres moderador')}
          />
        </View>
      ))}

      {myModeratorRole && (
        <ResignRow
          busy={actions.resign.isPending}
          onConfirm={() =>
            run(actions.resign, undefined, 'Renunciaste al cargo')
          }
        />
      )}

      {isOwner && (
        <>
          {outgoing.map(offer => (
            <OfferRow key={offer.seq} offer={offer} />
          ))}
          {moderators.map(holder => (
            <ModeratorRow
              key={holder.did}
              holder={holder}
              busy={actions.revoke.isPending}
              onConfirm={() =>
                run(actions.revoke, holder, 'Nombramiento retirado')
              }
            />
          ))}
          <OfferPicker
            communityId={communityId}
            holders={holders}
            offers={offers}
            viewerDid={viewerDid}
            busy={actions.offer.isPending}
            onOffer={did => run(actions.offer, did, 'Oferta enviada')}
          />
        </>
      )}
    </View>
  )
}

function Action({
  label,
  busy,
  onPress,
  danger,
}: {
  label: string
  busy?: boolean
  onPress: () => void
  danger?: boolean
}) {
  const t = useTheme()
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={
        danger
          ? 'Publica un registro en tu cuenta; deshacerlo requiere otro registro'
          : 'Publica un registro en tu cuenta'
      }
      disabled={busy}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: busy
            ? t.palette.contrast_300
            : danger
              ? t.palette.negative_500
              : t.palette.primary_500,
        },
      ]}>
      <Text style={[styles.buttonText, {color: t.palette.white}]}>
        {busy ? 'Enviando...' : label}
      </Text>
    </TouchableOpacity>
  )
}

/** Two taps: the first asks, the second does it. */
function ConfirmAction({
  label,
  confirmLabel,
  busy,
  onConfirm,
}: {
  label: string
  confirmLabel: string
  busy?: boolean
  onConfirm: () => void
}) {
  const [asking, setAsking] = useState(false)
  return (
    <Action
      label={asking ? confirmLabel : label}
      busy={busy}
      danger
      onPress={() => {
        if (!asking) return setAsking(true)
        setAsking(false)
        onConfirm()
      }}
    />
  )
}

function ResignRow({busy, onConfirm}: {busy: boolean; onConfirm: () => void}) {
  const t = useTheme()
  return (
    <View style={styles.block}>
      <Text style={[styles.body, t.atoms.text]}>
        Eres moderador de esta comunidad.
      </Text>
      <ConfirmAction
        label="Renunciar al cargo"
        confirmLabel="Confirmar renuncia"
        busy={busy}
        onConfirm={onConfirm}
      />
    </View>
  )
}

function ModeratorRow({
  holder,
  busy,
  onConfirm,
}: {
  holder: CommunityRoleHolder
  busy: boolean
  onConfirm: () => void
}) {
  const t = useTheme()
  return (
    <View style={styles.block}>
      <Text style={[styles.mono, t.atoms.text_contrast_medium]} selectable>
        {holder.did}
      </Text>
      <ConfirmAction
        label="Retirar nombramiento"
        confirmLabel="Confirmar retiro"
        busy={busy}
        onConfirm={onConfirm}
      />
    </View>
  )
}

function OfferRow({offer}: {offer: CommunityRoleOffer}) {
  const t = useTheme()
  return (
    <View style={styles.block}>
      <Text style={[styles.mono, t.atoms.text_contrast_medium]} selectable>
        {offer.subject}
      </Text>
      <Text style={[styles.hint, t.atoms.text_contrast_medium]}>
        Esperando respuesta.
      </Text>
    </View>
  )
}

/** Active members who can still be offered the role, filtered as you type. */
function OfferPicker({
  communityId,
  holders,
  offers,
  viewerDid,
  busy,
  onOffer,
}: {
  communityId?: string
  holders: CommunityRoleHolder[]
  offers: CommunityRoleOffer[]
  viewerDid: string
  busy: boolean
  onOffer: (did: string) => void
}) {
  const t = useTheme()
  const [filter, setFilter] = useState('')
  const {data} = useCommunityMembersQuery({communityId, limit: 50})
  const needle = filter.trim().toLowerCase()
  const candidates = offerCandidates<CommunityMemberView>(data?.members ?? [], {
    holders,
    offers,
    viewerDid,
  })
    .filter(
      member =>
        !needle ||
        member.handle?.toLowerCase().includes(needle) ||
        member.displayName?.toLowerCase().includes(needle),
    )
    .slice(0, 8)

  return (
    <View style={styles.block}>
      <Text style={[styles.body, t.atoms.text]}>Ofrecer la moderación</Text>
      <TextInput
        accessibilityLabel="Buscar integrante"
        accessibilityHint="Filtra la lista de integrantes"
        placeholder="Buscar por nombre o usuario"
        placeholderTextColor={t.palette.contrast_500}
        value={filter}
        onChangeText={setFilter}
        autoCapitalize="none"
        style={[styles.input, t.atoms.text, t.atoms.border_contrast_low]}
      />
      {candidates.length === 0 ? (
        <Text style={[styles.hint, t.atoms.text_contrast_medium]}>
          No hay integrantes a quienes ofrecer el cargo.
        </Text>
      ) : (
        candidates.map(member => (
          <TouchableOpacity
            key={member.did}
            accessibilityRole="button"
            accessibilityLabel={`Ofrecer la moderación a ${member.handle ?? member.did}`}
            accessibilityHint="Publica una oferta de moderación para esta persona"
            disabled={busy}
            onPress={() => onOffer(member.did)}
            style={styles.candidate}>
            <Text style={[styles.body, t.atoms.text]} numberOfLines={1}>
              {member.displayName || member.handle || member.did}
            </Text>
            {member.handle ? (
              <Text style={[styles.hint, t.atoms.text_contrast_medium]}>
                @{member.handle}
              </Text>
            ) : null}
          </TouchableOpacity>
        ))
      )}
      <Text style={[styles.hint, t.atoms.text_contrast_medium]}>
        La oferta aparece en unos segundos. Si no aparece, la persona no es
        integrante activa.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {borderRadius: 14, padding: 16, marginBottom: 20},
  title: {fontSize: 16, fontWeight: '900', marginBottom: 6},
  block: {marginTop: 12, gap: 4},
  body: {fontSize: 14, fontWeight: '700'},
  mono: {fontSize: 11},
  hint: {fontSize: 12, lineHeight: 18},
  button: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {fontSize: 14, fontWeight: '900'},
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  candidate: {paddingVertical: 8},
})
