# PARA Next Step: Real Community MVP

Date baseline: April 17, 2026

## Summary

The next step for PARA is not adding more product surfaces. The next step is making one civic loop fully real.

Today, the app already has a strong concept:

- verified identity and public-figure treatment
- community discovery and governance
- policy, matter, RAQ, map, and representative surfaces

But the product is wider than it is deep. Several important civic modules still rely on mock or seeded data, while only part of the stack is truly live.

The recommendation is to ship one **Real Community MVP**:

- one community
- one real governance record
- one real feed of policy/matter discussion
- one real action a user can take
- one clear trust model tied to PARA verification

This should become the next product milestone.

## Why This Should Be Next

### 1. The app already has enough surface area

The client already exposes a large civic product area:

- Communities
- Community governance
- Community badges
- RAQ
- Policies and matters
- Representatives
- Map
- Cabildeo and delegate flows

The issue is not lack of ideas. The issue is that the product does not yet prove one durable user loop end to end.

### 2. Too many key experiences are still demo-backed

Current code suggests several civic services still depend on mock data or are not implemented against a real API:

- `src/lib/services/raq.ts`
- `src/lib/services/policies.ts`
- `src/lib/services/representatives.ts`
- `src/screens/Communities/CommunitiesScreen.tsx`

This creates a product risk: the app can appear advanced during exploration, but it may not yet create repeatable user value.

### 3. One slice is already becoming real

Community governance appears to be the strongest candidate for a real vertical because it already has a live query path:

- `src/state/queries/community-governance.ts`
- `src/lib/community-governance.ts`
- `watx/packages/bsky/src/data-plane/server/routes/profile.ts`

That means PARA already has a meaningful foothold for a real civic feature, not just a demo view.

### 4. Verification is a real differentiator

PARA's strongest product distinction is not generic social posting. It is trusted civic identity and legitimacy.

The current model is already coherent:

- PARA stores approval in `com.para.identity`
- AppView-visible trust comes through `app.bsky.graph.verification`
- the client uses that trusted state for public-figure treatment

Relevant references:

- `PARA/README.md`
- `watx/services/bsky/README.md`

This gives PARA a defensible wedge. The next milestone should use that wedge instead of sidelining it.

## Product Call

Build one **trust-to-action** loop and treat it as the core milestone.

In plain terms:

1. A user discovers a real community.
2. The user sees that the community has real governance and real accountable actors.
3. The user sees real policy or matter discussions in that community.
4. The user takes one meaningful action.
5. That action changes what they see next.

Until that loop is real, adding more destinations will mostly increase product complexity without proving product-market fit.

## Proposed MVP

### MVP name

Real Community MVP

### Scope

Ship one community where the following are all real:

- community directory entry
- community profile
- published governance record
- policy or matter feed
- one participation action

### Recommended first community action

Choose one action only for the MVP:

- post a policy
- post a matter
- endorse or support a policy/matter
- apply for a deputy role

Recommendation:

Start with **post a matter or policy inside one community**.

Why:

- it is easier to explain than delegation or full governance elections
- it creates immediate visible output
- it gives the product a living content loop
- it can later feed badges, governance, representative context, and ranking

If the team wants the trust layer to be more central on day one, the second-best option is:

- **apply for a deputy role inside one community**

That is more differentiated, but it is also operationally heavier.

## What To De-Scope For This Milestone

The following should not be treated as primary milestone requirements:

- nationwide map depth
- multi-community recommendation quality
- full RAQ network implementation
- representative directory maturity
- discourse-analysis polish
- broad party/civic directory completeness
- advanced delegation mechanics

These can remain present in the app, but the team should stop treating them as blockers for the next release.

## User Story

### Core user story

As a civic user, I can enter one real community, understand who is trusted there, see current public issues, and contribute in a way that other people can actually respond to.

### Success condition

The user should leave with the feeling:

"This is not just a concept demo. This community is live, accountable, and participatory."

## Product Requirements

### 1. Discovery

The user can reach the featured MVP community from a clear entry point.

Requirements:

- featured placement in Communities
- clear label that this is a live community
- no dead-end "coming soon" state around the primary path

### 2. Trust

The community must show visible legitimacy.

Requirements:

- published governance record loads successfully
- moderator, official, or deputy roles are visible
- verified public-figure treatment remains consistent where applicable

### 3. Live content

The user must see real policy or matter discussion.

Requirements:

- at least one live feed source
- explicit loading, error, and empty states
- no mock fallback injected into the main user path

### 4. Action

The user must be able to do one real thing.

Requirements:

- action is understandable in one sentence
- action writes to the real backend path
- action produces a visible result in the community experience

### 5. Feedback loop

The action must change the product state in a way the user can perceive.

Examples:

- new matter appears in the list
- policy receives support
- applicant appears in a governance role queue
- moderation/governance history updates

## Suggested Release Sequence

### Phase 1. Make one path real

- choose one flagship community
- remove mock fallback from the main path
- ensure governance, content, and one action all hit real backend flows

### Phase 2. Tighten trust and clarity

- improve copy around why the community is trusted
- show visible status for governance source and freshness
- make verified public-figure treatment feel intentional, not incidental

### Phase 3. Measure behavior

- track entry into the flagship community
- track action attempt rate
- track action completion rate
- track return rate to the same community

### Phase 4. Expand only after proof

- add a second community
- add a second action
- extend map, RAQ, and representative surfaces only when they strengthen the same loop

## Metrics

The MVP should be evaluated on behavior, not on surface count.

Primary metrics:

- percentage of users who open the featured community
- percentage of visitors who perform the primary action
- percentage of actors who return to the same community within 7 days
- number of real community posts/actions per week

Secondary metrics:

- governance card open rate
- verified actor interaction rate
- empty-state rate on the flagship community
- error rate on the primary community path

## Definition Of Done

The milestone is done when all of the following are true:

- one community path works without relying on mock data in the primary experience
- governance data loads from the real backend path
- users can perform one real civic action
- the result of that action is visible in the same session
- the experience has explicit loading, error, and empty states
- product analytics can measure discovery, action, and return behavior

## Risks

### 1. Keeping too much scope alive

If every civic module remains equally prioritized, the team will keep distributing effort across too many unfinished loops.

### 2. Confusing novelty for traction

The app can feel impressive during demos while still lacking a repeatable reason to come back.

### 3. Underusing verification

If PARA does not connect trust signals to participation, it risks becoming "Bluesky plus civic screens" instead of a differentiated civic network.

## Recommendation

The next milestone should be:

**Make one community real, trusted, and participatory.**

Everything else should support that milestone or move behind it.

## Appendix: Current Evidence In Code

Signals that the app is broad but not yet fully real:

- `src/lib/services/raq.ts` uses mock data and explicitly says the real API is not yet implemented.
- `src/lib/services/policies.ts` uses mock data and explicitly says the real API is not yet implemented.
- `src/lib/services/representatives.ts` uses mock data and explicitly says the real API is not yet implemented.
- `src/screens/Communities/CommunitiesScreen.tsx` still includes "coming soon" states for some matching flows.

Signals that a real vertical is possible now:

- `src/state/queries/community-governance.ts` fetches governance from a real XRPC path.
- `src/lib/community-governance.ts` defines normalization and durable governance structures.
- `watx/packages/bsky/src/data-plane/server/routes/profile.ts` includes PARA community governance response handling.
- `PARA/README.md` and `watx/services/bsky/README.md` describe a coherent verification model that can anchor trust in the product.
