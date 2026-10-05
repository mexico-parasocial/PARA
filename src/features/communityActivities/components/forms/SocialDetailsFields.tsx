import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {
  SOCIAL_ACTIVITY_ASSEMBLY,
  SOCIAL_ACTIVITY_CABILDEO,
  SOCIAL_ACTIVITY_PEACEFUL_MARCH,
  SOCIAL_ACTIVITY_SIGNATURE_DRIVE,
} from '#/lib/api/para-lexicons'
import {
  ASSEMBLY_FORMATS,
  INSTRUMENT_TYPES,
  PERMIT_STATUSES,
} from '#/lib/community-activities'
import {atoms as a} from '#/alf'
import * as TextField from '#/components/forms/TextField'
import {type SocialDraft} from '../../creation'
import {ChoiceChips} from '../ChoiceChips'
import {DateTimeRow, Section, TextRow} from './FormBits'

export function SocialDetailsFields({
  draft,
  onChange,
}: {
  draft: SocialDraft
  onChange: (draft: SocialDraft) => void
}) {
  const {_, i18n} = useLingui()
  const set = <K extends 'march' | 'signature' | 'assembly' | 'cabildeo'>(
    key: K,
    patch: Partial<SocialDraft[K]>,
  ) => onChange({...draft, [key]: {...draft[key], ...patch}})

  return (
    <>
      {draft.kind === SOCIAL_ACTIVITY_PEACEFUL_MARCH ? (
        <Section
          title={_(msg`Peaceful march`)}
          subtitle={_(
            msg`Public logistics only. Never publish a personal phone without consent.`,
          )}>
          <TextRow
            id="march.meetingPoint"
            label={_(msg`Meeting point`)}
            value={draft.march.meetingPoint}
            onChange={meetingPoint => set('march', {meetingPoint})}
            maxLength={300}
          />
          <TextRow
            id="march.route"
            label={_(msg`Route`)}
            value={draft.march.route}
            onChange={route => set('march', {route})}
            multiline
            maxLength={2000}
          />
          <TextRow
            id="march.destination"
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
              id="march.permitReference"
              help={_(
                msg`Reference for a notice or authorization, if applicable to your activity.`,
              )}
              label={_(msg`Permit or folio number (optional)`)}
              value={draft.march.permitReference}
              onChange={permitReference => set('march', {permitReference})}
            />
          ) : null}
          <TextRow
            id="march.expectedAttendance"
            label={_(msg`Expected attendance`)}
            value={draft.march.expectedAttendance}
            onChange={expectedAttendance => set('march', {expectedAttendance})}
            keyboardType="number-pad"
          />
          <TextRow
            id="march.safetyContact"
            label={_(msg`Safety or logistics contact`)}
            value={draft.march.safetyContact}
            onChange={safetyContact => set('march', {safetyContact})}
          />
          <TextRow
            id="march.accessibilityNotes"
            label={_(msg`Accessibility notes`)}
            value={draft.march.accessibilityNotes}
            onChange={accessibilityNotes => set('march', {accessibilityNotes})}
            multiline
          />
        </Section>
      ) : null}

      {draft.kind === SOCIAL_ACTIVITY_SIGNATURE_DRIVE ? (
        <Section
          title={_(msg`Signature drive`)}
          subtitle={_(
            msg`Describe what people will support, the signature target, and where and how they can sign.`,
          )}>
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
            id="signature.instrumentTitle"
            label={_(msg`Name of the bill, law or initiative`)}
            value={draft.signature.instrumentTitle}
            onChange={instrumentTitle => set('signature', {instrumentTitle})}
            maxLength={300}
          />
          <TextRow
            id="signature.instrumentUrl"
            label={_(msg`Link to the text (optional)`)}
            value={draft.signature.instrumentUrl}
            onChange={instrumentUrl => set('signature', {instrumentUrl})}
            keyboardType="url"
          />
          <TextRow
            id="signature.targetSignatures"
            label={_(msg`Signatures needed`)}
            value={draft.signature.targetSignatures}
            onChange={targetSignatures => set('signature', {targetSignatures})}
            keyboardType="number-pad"
          />
          <DateTimeRow
            id="signature.deadline"
            optional
            help={_(
              msg`Last day to collect signatures. The activity end describes the event schedule.`,
            )}
            dateLabel={_(msg`Deadline (optional)`)}
            date={draft.signature.deadline}
            onDate={deadline => set('signature', {deadline})}
          />
          <TextRow
            id="signature.collectionPoints"
            label={_(msg`Collection points (one per line)`)}
            value={draft.signature.collectionPoints}
            onChange={collectionPoints => set('signature', {collectionPoints})}
            multiline
          />
          <TextRow
            id="signature.signerRequirements"
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
        <Section
          title={_(msg`Assembly`)}
          subtitle={_(
            msg`Set the meeting format, how to join, the agenda, and any quorum needed.`,
          )}>
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
              id="assembly.meetingUrl"
              label={_(msg`Link to join`)}
              value={draft.assembly.meetingUrl}
              onChange={meetingUrl => set('assembly', {meetingUrl})}
              keyboardType="url"
            />
          ) : null}
          <TextRow
            id="assembly.agenda"
            label={_(msg`Agenda (one item per line)`)}
            value={draft.assembly.agenda}
            onChange={agenda => set('assembly', {agenda})}
            multiline
          />
          <TextRow
            id="assembly.quorumRequired"
            label={_(msg`Quorum required (optional)`)}
            value={draft.assembly.quorumRequired}
            onChange={quorumRequired => set('assembly', {quorumRequired})}
            keyboardType="number-pad"
          />
        </Section>
      ) : null}

      {draft.kind === SOCIAL_ACTIVITY_CABILDEO ? (
        <Section
          title={_(msg`Cabildeo`)}
          subtitle={_(
            msg`Set the conversation format and how to join. Meeting documentation is optional when scheduling.`,
          )}>
          <View style={[a.gap_sm]}>
            <TextField.LabelText>{_(msg`Format`)}</TextField.LabelText>
            <ChoiceChips
              label={_(msg`Cabildeo format`)}
              value={draft.cabildeo.format}
              onChange={format => set('cabildeo', {format})}
              options={ASSEMBLY_FORMATS.map(f => ({
                value: f.value,
                label: i18n._(f.label),
              }))}
            />
          </View>
          {draft.cabildeo.format !== 'in_person' ? (
            <TextRow
              id="cabildeo.meetingUrl"
              label={_(msg`Link to join`)}
              value={draft.cabildeo.meetingUrl}
              onChange={meetingUrl => set('cabildeo', {meetingUrl})}
              keyboardType="url"
            />
          ) : null}
          <Section
            title={_(msg`Meeting documentation (optional)`)}
            subtitle={_(
              msg`Leave these fields empty when scheduling. Use them only if you already have a record of the conversation.`,
            )}>
            <TextRow
              id="cabildeo.participants"
              label={_(msg`Who took part (one per line)`)}
              value={draft.cabildeo.participants}
              onChange={participants => set('cabildeo', {participants})}
              multiline
            />
            <TextRow
              id="cabildeo.arguments"
              label={_(msg`What was argued (one point per line)`)}
              value={draft.cabildeo.arguments}
              onChange={args => set('cabildeo', {arguments: args})}
              multiline
            />
            <TextRow
              id="cabildeo.outcome"
              label={_(msg`Where it landed (optional)`)}
              value={draft.cabildeo.outcome}
              onChange={outcome => set('cabildeo', {outcome})}
              multiline
              maxLength={2000}
            />
            <TextRow
              id="cabildeo.recordingUrl"
              label={_(msg`Link to the recording (optional)`)}
              value={draft.cabildeo.recordingUrl}
              onChange={recordingUrl => set('cabildeo', {recordingUrl})}
              keyboardType="url"
            />
          </Section>
        </Section>
      ) : null}
    </>
  )
}
