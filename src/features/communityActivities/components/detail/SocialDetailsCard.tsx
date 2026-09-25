import {useState} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  SOCIAL_ACTIVITY_ASSEMBLY,
  SOCIAL_ACTIVITY_PEACEFUL_MARCH,
  SOCIAL_ACTIVITY_SIGNATURE_DRIVE,
  type SocialActivitySignatureDrive,
} from '#/lib/api/para-lexicons'
import {
  ASSEMBLY_FORMATS,
  INSTRUMENT_TYPES,
  PERMIT_STATUSES,
} from '#/lib/community-activities'
import {cleanError} from '#/lib/strings/errors'
import {
  type SocialActivityView,
  useUpdateCommunityActivityMutation,
} from '#/state/queries/community-activities'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as TextField from '#/components/forms/TextField'
import {InlineLinkText} from '#/components/Link'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {BulletList, Card, ProgressBar, Row} from './CardBits'

export function SocialDetailsCard({
  activity,
  isOrganizer,
}: {
  activity: SocialActivityView
  isOrganizer: boolean
}) {
  const {_, i18n} = useLingui()
  const details = activity.record.details

  if (details.$type === SOCIAL_ACTIVITY_PEACEFUL_MARCH) {
    const permit = PERMIT_STATUSES.find(p => p.value === details.permitStatus)
    return (
      <Card title={_(msg`March logistics`)}>
        <Row label={_(msg`Meeting point`)} value={details.meetingPoint} />
        <Row label={_(msg`Destination`)} value={details.destination} />
        <Row label={_(msg`Route`)} value={details.route} />
        <Row
          label={_(msg`Permit or notice`)}
          value={
            permit
              ? [i18n._(permit.label), details.permitReference]
                  .filter(Boolean)
                  .join(' · ')
              : undefined
          }
          emphasis
        />
        <Row
          label={_(msg`Expected attendance`)}
          value={
            details.expectedAttendance !== undefined
              ? i18n.number(details.expectedAttendance)
              : undefined
          }
        />
        <Row label={_(msg`Safety contact`)} value={details.safetyContact} />
        <Row label={_(msg`Accessibility`)} value={details.accessibilityNotes} />
      </Card>
    )
  }

  if (details.$type === SOCIAL_ACTIVITY_SIGNATURE_DRIVE) {
    return (
      <SignatureDriveCard
        activity={activity}
        drive={details}
        isOrganizer={isOrganizer}
      />
    )
  }

  if (details.$type === SOCIAL_ACTIVITY_ASSEMBLY) {
    const format = ASSEMBLY_FORMATS.find(f => f.value === details.format)
    return (
      <Card title={_(msg`Assembly`)}>
        <Row
          label={_(msg`Format`)}
          value={format ? i18n._(format.label) : details.format}
        />
        {details.meetingUrl ? (
          <InlineLinkText
            to={details.meetingUrl}
            label={_(msg`Join online`)}
            style={[a.text_md, a.font_semi_bold]}>
            {_(msg`Join online`)}
          </InlineLinkText>
        ) : null}
        <Row
          label={_(msg`Quorum required`)}
          value={
            details.quorumRequired !== undefined
              ? i18n.number(details.quorumRequired)
              : undefined
          }
        />
        <BulletList title={_(msg`Agenda`)} items={details.agenda} />
      </Card>
    )
  }

  return null
}

function SignatureDriveCard({
  activity,
  drive,
  isOrganizer,
}: {
  activity: SocialActivityView
  drive: SocialActivitySignatureDrive
  isOrganizer: boolean
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const collected = drive.signaturesCollected ?? 0
  const update = useUpdateCommunityActivityMutation()
  const [draft, setDraft] = useState(String(collected))
  const instrument = INSTRUMENT_TYPES.find(
    i => i.value === drive.instrumentType,
  )

  return (
    <Card
      title={_(msg`Signature drive`)}
      subtitle={instrument ? i18n._(instrument.label) : undefined}>
      {drive.instrumentUrl ? (
        <InlineLinkText
          to={drive.instrumentUrl}
          label={drive.instrumentTitle}
          style={[a.text_md, a.font_semi_bold]}>
          {drive.instrumentTitle}
        </InlineLinkText>
      ) : (
        <Text style={[a.text_md, a.font_semi_bold]}>
          {drive.instrumentTitle}
        </Text>
      )}
      <ProgressBar
        bps={Math.floor((collected * 10000) / drive.targetSignatures)}
      />
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
        <Trans>
          {i18n.number(collected)} of {i18n.number(drive.targetSignatures)}{' '}
          signatures
        </Trans>
      </Text>
      <Row
        label={_(msg`Deadline`)}
        value={
          drive.deadline
            ? i18n.date(new Date(drive.deadline), {dateStyle: 'medium'})
            : undefined
        }
      />
      <Row label={_(msg`Signers need`)} value={drive.signerRequirements} />
      <BulletList
        title={_(msg`Where to sign`)}
        items={drive.collectionPoints}
      />
      {isOrganizer ? (
        <View style={[a.flex_row, a.gap_sm, a.align_center]}>
          <View style={[a.flex_1]}>
            <TextField.Root>
              <TextField.Input
                label={_(msg`Signatures collected`)}
                value={draft}
                onChangeText={setDraft}
                keyboardType="number-pad"
              />
            </TextField.Root>
          </View>
          <Button
            label={_(msg`Update signature count`)}
            size="small"
            color="primary"
            disabled={update.isPending}
            onPress={() => {
              const value = Number(draft)
              if (!Number.isInteger(value) || value < 0) return
              update.mutate(
                {
                  activity,
                  changes: {details: {...drive, signaturesCollected: value}},
                },
                {onError: err => Toast.show(cleanError(err), {type: 'error'})},
              )
            }}>
            <ButtonText>
              <Trans>Update</Trans>
            </ButtonText>
          </Button>
        </View>
      ) : null}
    </Card>
  )
}
