import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {
  type AssemblyFormat,
  type PeacefulMarchPermitStatus,
  type SignatureDriveInstrumentType,
  SOCIAL_ACTIVITY_ASSEMBLY,
  SOCIAL_ACTIVITY_PEACEFUL_MARCH,
  SOCIAL_ACTIVITY_SIGNATURE_DRIVE,
  type SocialActivityDetails,
} from '#/lib/api/para-lexicons'
import {
  ASSEMBLY_FORMATS,
  INSTRUMENT_TYPES,
  PERMIT_STATUSES,
  SOCIAL_ACTIVITY_KINDS,
  type SocialActivityKind,
} from '#/lib/community-activities'
import {atoms as a} from '#/alf'
import * as TextField from '#/components/forms/TextField'
import {ChoiceChips} from '../ChoiceChips'
import {
  type Built,
  combineDateTime,
  DateTimeRow,
  optionalCount,
  Section,
  splitLines,
  TextRow,
  type Translate,
} from './FormBits'

export type SocialDraft = {
  kind: SocialActivityKind
  march: {
    meetingPoint: string
    route: string
    destination: string
    permitStatus: PeacefulMarchPermitStatus
    permitReference: string
    expectedAttendance: string
    safetyContact: string
    accessibilityNotes: string
  }
  signature: {
    instrumentType: SignatureDriveInstrumentType
    instrumentTitle: string
    instrumentUrl: string
    targetSignatures: string
    deadline: string
    collectionPoints: string
    signerRequirements: string
  }
  assembly: {
    format: AssemblyFormat
    meetingUrl: string
    agenda: string
    quorumRequired: string
  }
}

export const EMPTY_SOCIAL_DRAFT: SocialDraft = {
  kind: SOCIAL_ACTIVITY_PEACEFUL_MARCH,
  march: {
    meetingPoint: '',
    route: '',
    destination: '',
    permitStatus: 'requested',
    permitReference: '',
    expectedAttendance: '',
    safetyContact: '',
    accessibilityNotes: '',
  },
  signature: {
    instrumentType: 'bill',
    instrumentTitle: '',
    instrumentUrl: '',
    targetSignatures: '',
    deadline: '',
    collectionPoints: '',
    signerRequirements: '',
  },
  assembly: {
    format: 'in_person',
    meetingUrl: '',
    agenda: '',
    quorumRequired: '',
  },
}

const orUndefined = (value: string) => value.trim() || undefined

export function buildSocialDetails(
  draft: SocialDraft,
  _: Translate,
): Built<SocialActivityDetails> {
  const problems: string[] = []
  if (draft.kind === SOCIAL_ACTIVITY_PEACEFUL_MARCH) {
    const m = draft.march
    const attendance = optionalCount(m.expectedAttendance)
    if (!m.meetingPoint.trim()) problems.push(_(msg`Say where people meet.`))
    if (Number.isNaN(attendance)) {
      problems.push(_(msg`Expected attendance must be a whole number.`))
    }
    return {
      problems,
      value: {
        $type: SOCIAL_ACTIVITY_PEACEFUL_MARCH,
        meetingPoint: m.meetingPoint.trim(),
        route: orUndefined(m.route),
        destination: orUndefined(m.destination),
        permitStatus: m.permitStatus,
        permitReference: orUndefined(m.permitReference),
        expectedAttendance: attendance,
        safetyContact: orUndefined(m.safetyContact),
        accessibilityNotes: orUndefined(m.accessibilityNotes),
      },
    }
  }
  if (draft.kind === SOCIAL_ACTIVITY_SIGNATURE_DRIVE) {
    const sd = draft.signature
    const target = optionalCount(sd.targetSignatures)
    if (!sd.instrumentTitle.trim()) {
      problems.push(_(msg`Name the bill, law or initiative.`))
    }
    if (!target) problems.push(_(msg`Set how many signatures are needed.`))
    return {
      problems,
      value: {
        $type: SOCIAL_ACTIVITY_SIGNATURE_DRIVE,
        instrumentType: sd.instrumentType,
        instrumentTitle: sd.instrumentTitle.trim(),
        instrumentUrl: orUndefined(sd.instrumentUrl),
        targetSignatures: target ?? 0,
        signaturesCollected: 0,
        deadline: combineDateTime(sd.deadline, '23:59'),
        collectionPoints: splitLines(sd.collectionPoints),
        signerRequirements: orUndefined(sd.signerRequirements),
      },
    }
  }
  const as = draft.assembly
  const quorum = optionalCount(as.quorumRequired)
  if (Number.isNaN(quorum))
    problems.push(_(msg`Quorum must be a whole number.`))
  if (as.format !== 'in_person' && !as.meetingUrl.trim()) {
    problems.push(_(msg`Add the link to join online.`))
  }
  return {
    problems,
    value: {
      $type: SOCIAL_ACTIVITY_ASSEMBLY,
      format: as.format,
      meetingUrl: orUndefined(as.meetingUrl),
      agenda: splitLines(as.agenda),
      quorumRequired: quorum,
    },
  }
}

export function SocialDetailsFields({
  draft,
  onChange,
}: {
  draft: SocialDraft
  onChange: (draft: SocialDraft) => void
}) {
  const {_, i18n} = useLingui()
  const set = <K extends 'march' | 'signature' | 'assembly'>(
    key: K,
    patch: Partial<SocialDraft[K]>,
  ) => onChange({...draft, [key]: {...draft[key], ...patch}})

  return (
    <>
      <Section title={_(msg`What kind of civic activity?`)}>
        <ChoiceChips
          label={_(msg`Activity kind`)}
          value={draft.kind}
          onChange={kind => onChange({...draft, kind})}
          options={SOCIAL_ACTIVITY_KINDS.map(kind => ({
            value: kind.value,
            label: `${kind.emoji} ${i18n._(kind.label)}`,
          }))}
        />
      </Section>

      {draft.kind === SOCIAL_ACTIVITY_PEACEFUL_MARCH ? (
        <Section
          title={_(msg`Peaceful march`)}
          subtitle={_(
            msg`Public logistics only. Never publish a personal phone without consent.`,
          )}>
          <TextRow
            label={_(msg`Meeting point`)}
            value={draft.march.meetingPoint}
            onChange={meetingPoint => set('march', {meetingPoint})}
            maxLength={300}
          />
          <TextRow
            label={_(msg`Route`)}
            value={draft.march.route}
            onChange={route => set('march', {route})}
            multiline
            maxLength={2000}
          />
          <TextRow
            label={_(msg`Destination`)}
            value={draft.march.destination}
            onChange={destination => set('march', {destination})}
            maxLength={300}
          />
          <View style={[a.gap_sm]}>
            <TextField.LabelText>
              {_(msg`Permit or notice`)}
            </TextField.LabelText>
            <ChoiceChips
              label={_(msg`Permit status`)}
              value={draft.march.permitStatus}
              onChange={permitStatus => set('march', {permitStatus})}
              options={PERMIT_STATUSES.map(p => ({
                value: p.value,
                label: i18n._(p.label),
              }))}
            />
          </View>
          {draft.march.permitStatus !== 'not_required' ? (
            <TextRow
              label={_(msg`Permit or folio number (optional)`)}
              value={draft.march.permitReference}
              onChange={permitReference => set('march', {permitReference})}
            />
          ) : null}
          <TextRow
            label={_(msg`Expected attendance`)}
            value={draft.march.expectedAttendance}
            onChange={expectedAttendance => set('march', {expectedAttendance})}
            keyboardType="number-pad"
          />
          <TextRow
            label={_(msg`Safety or logistics contact`)}
            value={draft.march.safetyContact}
            onChange={safetyContact => set('march', {safetyContact})}
          />
          <TextRow
            label={_(msg`Accessibility notes`)}
            value={draft.march.accessibilityNotes}
            onChange={accessibilityNotes => set('march', {accessibilityNotes})}
            multiline
          />
        </Section>
      ) : null}

      {draft.kind === SOCIAL_ACTIVITY_SIGNATURE_DRIVE ? (
        <Section title={_(msg`Signature drive`)}>
          <View style={[a.gap_sm]}>
            <TextField.LabelText>{_(msg`Supporting a`)}</TextField.LabelText>
            <ChoiceChips
              label={_(msg`Instrument type`)}
              value={draft.signature.instrumentType}
              onChange={instrumentType => set('signature', {instrumentType})}
              options={INSTRUMENT_TYPES.map(type => ({
                value: type.value,
                label: i18n._(type.label),
              }))}
            />
          </View>
          <TextRow
            label={_(msg`Name of the bill, law or initiative`)}
            value={draft.signature.instrumentTitle}
            onChange={instrumentTitle => set('signature', {instrumentTitle})}
            maxLength={300}
          />
          <TextRow
            label={_(msg`Link to the text (optional)`)}
            value={draft.signature.instrumentUrl}
            onChange={instrumentUrl => set('signature', {instrumentUrl})}
            keyboardType="url"
          />
          <TextRow
            label={_(msg`Signatures needed`)}
            value={draft.signature.targetSignatures}
            onChange={targetSignatures => set('signature', {targetSignatures})}
            keyboardType="number-pad"
          />
          <DateTimeRow
            dateLabel={_(msg`Deadline (optional)`)}
            date={draft.signature.deadline}
            onDate={deadline => set('signature', {deadline})}
          />
          <TextRow
            label={_(msg`Collection points (one per line)`)}
            value={draft.signature.collectionPoints}
            onChange={collectionPoints => set('signature', {collectionPoints})}
            multiline
          />
          <TextRow
            label={_(msg`What signers need`)}
            placeholder={_(msg`e.g. voter ID from this district`)}
            value={draft.signature.signerRequirements}
            onChange={signerRequirements =>
              set('signature', {signerRequirements})
            }
            multiline
          />
        </Section>
      ) : null}

      {draft.kind === SOCIAL_ACTIVITY_ASSEMBLY ? (
        <Section title={_(msg`Assembly`)}>
          <View style={[a.gap_sm]}>
            <TextField.LabelText>{_(msg`Format`)}</TextField.LabelText>
            <ChoiceChips
              label={_(msg`Assembly format`)}
              value={draft.assembly.format}
              onChange={format => set('assembly', {format})}
              options={ASSEMBLY_FORMATS.map(f => ({
                value: f.value,
                label: i18n._(f.label),
              }))}
            />
          </View>
          {draft.assembly.format !== 'in_person' ? (
            <TextRow
              label={_(msg`Link to join`)}
              value={draft.assembly.meetingUrl}
              onChange={meetingUrl => set('assembly', {meetingUrl})}
              keyboardType="url"
            />
          ) : null}
          <TextRow
            label={_(msg`Agenda (one item per line)`)}
            value={draft.assembly.agenda}
            onChange={agenda => set('assembly', {agenda})}
            multiline
          />
          <TextRow
            label={_(msg`Quorum required (optional)`)}
            value={draft.assembly.quorumRequired}
            onChange={quorumRequired => set('assembly', {quorumRequired})}
            keyboardType="number-pad"
          />
        </Section>
      ) : null}
    </>
  )
}
