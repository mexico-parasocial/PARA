/**
 * RAQ (Rapid Alignment Questions) Service
 *
 * Real API integration — no mock data.
 */

import {type BskyAgent} from '@atproto/api'

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
import {type PaginationParams, type ServiceResponse} from './types'

// ------------------------------------------------------------------
// Static questionnaire definition (this is app config, not server data)
// ------------------------------------------------------------------

export async function fetchRAQAxes() {
  return RAQ_AXES
}

// ------------------------------------------------------------------
// Open Question (creates a standard Bluesky post with #?OpenQuestion tag)
// ------------------------------------------------------------------

export async function submitOpenQuestion(agent: BskyAgent, text: string) {
  await agent.post({
    text,
    tags: ['?OpenQuestion'],
    createdAt: new Date().toISOString(),
  })
}

// ------------------------------------------------------------------
// User Alignment
// ------------------------------------------------------------------

export async function fetchUserAlignment(agent: BskyAgent, did: string) {
  const res = await agent.call('com.para.raq.getUserAlignment', {did})
  return res.data.assessment
}

// ------------------------------------------------------------------
// Community Alignment
// ------------------------------------------------------------------

export async function fetchCommunityAlignment(
  agent: BskyAgent,
  community: string,
) {
  const res = await agent.call('com.para.raq.getCommunityAlignment', {
    community,
  })
  return res.data
}

// ------------------------------------------------------------------
// Proposals (com.para.raq.proposal records)
// ------------------------------------------------------------------

export async function fetchProposedQuestions(
  agent: BskyAgent,
  _did: string,
  params?: PaginationParams & {community?: string},
): Promise<ServiceResponse<ParaRaqProposalView[]>> {
  const res = await agent.call('com.para.raq.getProposals', {
    community: params?.community,
    limit: params?.limit || 50,
    cursor: params?.cursor,
  })

  const proposals = (res.data.proposals as ParaRaqProposalView[]) || []
  return {data: proposals, cursor: res.data.cursor}
}

export async function submitProposedQuestion(
  agent: BskyAgent,
  text: string,
  targetAxis?: string,
  targetCommunity?: string,
) {
  const record: ParaRaqProposalRecord = {
    text,
    targetAxis,
    targetCommunity,
    createdAt: new Date().toISOString(),
  }

  await agent.com.atproto.repo.putRecord({
    repo: agent.assertDid,
    collection: PARA_RAQ_PROPOSAL_COLLECTION,
    rkey: await generateTid(),
    record: record as unknown as Record<string, unknown>,
    validate: false,
  })
}

// ------------------------------------------------------------------
// Axis Votes (com.para.raq.axisVote records)
// ------------------------------------------------------------------

export async function fetchAxisVotes(
  agent: BskyAgent,
  did: string,
  params?: PaginationParams,
): Promise<ServiceResponse<ParaRaqAxisVoteRecord[]>> {
  const res = await agent.com.atproto.repo.listRecords({
    repo: did,
    collection: PARA_RAQ_AXIS_VOTE_COLLECTION,
    limit: params?.limit || 20,
    cursor: params?.cursor,
  })

  const records =
    res.data.records
      ?.map(r => r.value as unknown as ParaRaqAxisVoteRecord)
      .filter(Boolean) || []

  return {data: records, cursor: res.data.cursor}
}

export async function submitAxisVote(
  agent: BskyAgent,
  axisId: string,
  value: number,
) {
  const proof = await issueParaVoteProof(agent, {
    subjectUri: axisId,
    subjectType: 'raq_axis',
  })
  const record: ParaRaqAxisVoteRecord = {
    axisId,
    value,
    voteNullifier: proof?.voteNullifier,
    eligibilityProofRef: proof?.eligibilityProofRef,
    createdAt: new Date().toISOString(),
  }

  await agent.com.atproto.repo.putRecord({
    repo: agent.assertDid,
    collection: PARA_RAQ_AXIS_VOTE_COLLECTION,
    rkey: await generateTid(),
    record: record as unknown as Record<string, unknown>,
    validate: false,
  })
}

export async function submitProposalVote(
  agent: BskyAgent,
  subject: string,
  value: number,
) {
  const proof = await issueParaVoteProof(agent, {
    subjectUri: subject,
    subjectType: 'raq_proposal',
  })
  const record: ParaRaqProposalVoteRecord = {
    subject,
    value: value > 0 ? 1 : value < 0 ? -1 : 0,
    voteNullifier: proof?.voteNullifier,
    eligibilityProofRef: proof?.eligibilityProofRef,
    createdAt: new Date().toISOString(),
  }

  await agent.com.atproto.repo.putRecord({
    repo: agent.assertDid,
    collection: PARA_RAQ_PROPOSAL_VOTE_COLLECTION,
    rkey: await generateTid(),
    record: record as unknown as Record<string, unknown>,
    validate: false,
  })
}

export async function submitProposalAnswer(
  agent: BskyAgent,
  subject: string,
  value: number,
) {
  const record: ParaRaqProposalAnswerRecord = {
    subject,
    value: Math.max(-3, Math.min(3, value)),
    createdAt: new Date().toISOString(),
  }

  await agent.com.atproto.repo.putRecord({
    repo: agent.assertDid,
    collection: PARA_RAQ_PROPOSAL_ANSWER_COLLECTION,
    rkey: await generateTid(),
    record: record as unknown as Record<string, unknown>,
    validate: false,
  })
}

// ------------------------------------------------------------------
// Assessment Publishing (com.para.raq.assessment record)
// ------------------------------------------------------------------

export async function publishRaqAssessment(
  agent: BskyAgent,
  assessment: ParaRaqAssessmentRecord,
) {
  await agent.com.atproto.repo.putRecord({
    repo: agent.assertDid,
    collection: PARA_RAQ_ASSESSMENT_COLLECTION,
    rkey: await generateTid(),
    record: assessment as unknown as Record<string, unknown>,
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
