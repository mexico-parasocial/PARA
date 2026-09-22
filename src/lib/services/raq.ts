/**
 * RAQ (Rapid Alignment Questions) Service
 *
 * Real API integration — no mock data.
 */

import {type LexMap} from '@atproto/lex'
import {type AtIdentifierString, type DidString} from '@atproto/syntax'

import {
  PARA_RAQ_ASSESSMENT_COLLECTION,
  PARA_RAQ_AXIS_VOTE_COLLECTION,
  PARA_RAQ_PROPOSAL_ANSWER_COLLECTION,
  PARA_RAQ_PROPOSAL_COLLECTION,
  PARA_RAQ_PROPOSAL_VOTE_COLLECTION,
  type ParaRaqAssessmentRecord,
  type ParaRaqAxisVoteRecord,
  type ParaRaqProposalAnswerRecord,
  type ParaRaqProposalRecord,
  type ParaRaqProposalView,
  type ParaRaqProposalVoteRecord,
} from '#/lib/api/para-lexicons'
import {issueParaVoteProof} from '#/lib/api/vote-proof'
import {RAQ_AXES} from '#/lib/mock-data'
import {
  type PublicSessionBundle,
  type SessionBundle,
} from '#/state/session/session-core'
import {com} from '#/lexicons'
import {type PaginationParams, type ServiceResponse} from './types'

/** Any `useAgent()` result: authenticated session or public (logged-out). */
export type ParaServiceAgent = SessionBundle | PublicSessionBundle

// ------------------------------------------------------------------
// Static questionnaire definition (this is app config, not server data)
// ------------------------------------------------------------------

export async function fetchRAQAxes() {
  return RAQ_AXES
}

// ------------------------------------------------------------------
// Open Question (creates a standard Bluesky post with #?OpenQuestion tag)
// ------------------------------------------------------------------

export async function submitOpenQuestion(
  agent: ParaServiceAgent,
  text: string,
) {
  if (!agent.session) throw new Error('Not logged in')
  await agent.pdsClient.call(com.atproto.repo.createRecord, {
    repo: agent.session.did,
    collection: 'app.bsky.feed.post',
    record: {
      $type: 'app.bsky.feed.post',
      text,
      tags: ['?OpenQuestion'],
      createdAt: new Date().toISOString(),
    },
  })
}

// ------------------------------------------------------------------
// User Alignment
// ------------------------------------------------------------------

export async function fetchUserAlignment(agent: ParaServiceAgent, did: string) {
  const res = await agent.appviewClient.call(com.para.raq.getUserAlignment, {
    did: did as DidString,
  })
  return res.assessment
}

// ------------------------------------------------------------------
// Community Alignment
// ------------------------------------------------------------------

export async function fetchCommunityAlignment(
  agent: ParaServiceAgent,
  community: string,
) {
  const res = await agent.appviewClient.call(
    com.para.raq.getCommunityAlignment,
    {community},
  )
  return res
}

// ------------------------------------------------------------------
// Proposals (com.para.raq.proposal records)
// ------------------------------------------------------------------

export async function fetchProposedQuestions(
  agent: ParaServiceAgent,
  _did: string,
  params?: PaginationParams & {community?: string},
): Promise<ServiceResponse<ParaRaqProposalView[]>> {
  const res = await agent.appviewClient.call(com.para.raq.getProposals, {
    community: params?.community,
    limit: params?.limit || 50,
    cursor: params?.cursor,
  })

  const proposals = (res.proposals as ParaRaqProposalView[]) || []
  return {data: proposals, cursor: res.cursor}
}

export async function submitProposedQuestion(
  agent: ParaServiceAgent,
  text: string,
  targetAxis?: string,
  targetCommunity?: string,
) {
  const did = agent.session?.did
  if (!did) throw new Error('Not logged in')
  const record: ParaRaqProposalRecord = {
    text,
    targetAxis,
    targetCommunity,
    createdAt: new Date().toISOString(),
  }

  await agent.pdsClient.call(com.atproto.repo.putRecord, {
    repo: did,
    collection: PARA_RAQ_PROPOSAL_COLLECTION,
    rkey: await generateTid(),
    record: record as unknown as LexMap,
    validate: false,
  })
}

// ------------------------------------------------------------------
// Axis Votes (com.para.raq.axisVote records)
// ------------------------------------------------------------------

export async function fetchAxisVotes(
  agent: ParaServiceAgent,
  did: string,
  params?: PaginationParams,
): Promise<ServiceResponse<ParaRaqAxisVoteRecord[]>> {
  const res = await agent.pdsClient.call(com.atproto.repo.listRecords, {
    repo: did as AtIdentifierString,
    collection: PARA_RAQ_AXIS_VOTE_COLLECTION,
    limit: params?.limit || 20,
    cursor: params?.cursor,
  })

  const records =
    res.records
      ?.map(r => r.value as unknown as ParaRaqAxisVoteRecord)
      .filter(Boolean) || []

  return {data: records, cursor: res.cursor}
}

export async function submitAxisVote(
  agent: ParaServiceAgent,
  axisId: string,
  value: number,
) {
  const did = agent.session?.did
  if (!did) throw new Error('Not logged in')
  const proof = await issueParaVoteProof(agent, {
    subjectUri: axisId,
    subjectType: 'raq_axis',
  })
  const record: ParaRaqAxisVoteRecord = {
    axisId,
    value,
    voteNullifier: proof.voteNullifier,
    eligibilityProofRef: proof.eligibilityProofRef,
    createdAt: new Date().toISOString(),
  }

  await agent.pdsClient.call(com.atproto.repo.putRecord, {
    repo: did,
    collection: PARA_RAQ_AXIS_VOTE_COLLECTION,
    rkey: await generateTid(),
    record: record as unknown as LexMap,
    validate: false,
  })
}

export async function submitProposalVote(
  agent: ParaServiceAgent,
  subject: string,
  value: number,
) {
  const did = agent.session?.did
  if (!did) throw new Error('Not logged in')
  const proof = await issueParaVoteProof(agent, {
    subjectUri: subject,
    subjectType: 'raq_proposal',
  })
  const record: ParaRaqProposalVoteRecord = {
    subject,
    value: value > 0 ? 1 : value < 0 ? -1 : 0,
    voteNullifier: proof.voteNullifier,
    eligibilityProofRef: proof.eligibilityProofRef,
    createdAt: new Date().toISOString(),
  }

  await agent.pdsClient.call(com.atproto.repo.putRecord, {
    repo: did,
    collection: PARA_RAQ_PROPOSAL_VOTE_COLLECTION,
    rkey: await generateTid(),
    record: record as unknown as LexMap,
    validate: false,
  })
}

export async function submitProposalAnswer(
  agent: ParaServiceAgent,
  subject: string,
  value: number,
) {
  const did = agent.session?.did
  if (!did) throw new Error('Not logged in')
  const record: ParaRaqProposalAnswerRecord = {
    subject,
    value: Math.max(-3, Math.min(3, value)),
    createdAt: new Date().toISOString(),
  }

  await agent.pdsClient.call(com.atproto.repo.putRecord, {
    repo: did,
    collection: PARA_RAQ_PROPOSAL_ANSWER_COLLECTION,
    rkey: await generateTid(),
    record: record as unknown as LexMap,
    validate: false,
  })
}

// ------------------------------------------------------------------
// Assessment Publishing (com.para.raq.assessment record)
// ------------------------------------------------------------------

export async function publishRaqAssessment(
  agent: ParaServiceAgent,
  assessment: ParaRaqAssessmentRecord,
) {
  const did = agent.session?.did
  if (!did) throw new Error('Not logged in')
  await agent.pdsClient.call(com.atproto.repo.putRecord, {
    repo: did,
    collection: PARA_RAQ_ASSESSMENT_COLLECTION,
    rkey: await generateTid(),
    record: assessment as unknown as LexMap,
    validate: false,
  })
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

async function generateTid(): Promise<string> {
  // Use a simple timestamp-based TID for now
  // In production this should use @atproto/common-web TID
  const now = Date.now()
  const random = Math.floor(Math.random() * 1000)
    .toString(36)
    .padStart(3, '0')
  return `r${now.toString(36)}${random}`
}
