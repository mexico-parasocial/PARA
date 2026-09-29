# Revocable mandates and quadratic voice

> Status: **decided rules, experimental arithmetic.** The mandate rules in §3
> apply now. Quadratic voting stays gated and in shadow (§4); nothing in this
> document makes it decide anything.
>
> Code: `src/lib/mandates/voice.ts` (arithmetic, tested), `src/state/shell/acuerdos.tsx`
> (locks), `src/screens/Agora/components/{IntensityScale,DelegatedVoiceCard,VoteComposer}.tsx` (UI).

## 1. Why

`horizontal-governance-spec.md` says delegation is opt-in per proposal, one
hop, expires after each proposal, and has no permanent delegates. It comes from
*revocación en cualquier momento* and *rotatividad de cargos*: nobody should
hold power that the people who lent it cannot take back.

The acuerdo code broke that in three ways:

1. **Leaving did not release the vote.** `requestExit` stamped a 48 h cooldown
   and never removed the lock or lowered `lockedCount`.
2. **Locks never ended.** Every lock had `expiresAt: null`.
3. **Other people chose the chain.** `parentAcuerdo` is set by whoever creates
   the child acuerdo; members of the child were carried into the parent.

A delegation that *persists* is not the problem. A delegation that the person
did not choose, cannot see being used, or cannot take back is. So the rule
becomes:

> **A delegation may persist, but only if the person chose it, can revoke it
> at any moment with immediate effect, and sees it every time it is used.**

We call such a delegation a **mandate** (*mandato*), as in *mandar
obedeciendo*: lent, scoped, and taken back at will.

## 2. Words

The UI uses these words and no others.

| Word | Meaning |
|---|---|
| **voz** (voice) | How strongly one person's ballot counts: the magnitude of their signal, 1 to 3. |
| **crédito** (credit) | What a voice costs. A voice of *k* costs *k²* credits. |
| **prestar tu voz** (lend your voice) | Grant a mandate. |
| **retirar** (take back) | Revoke a mandate. |
| **tope** (cap) | The most people one delegate may carry. |

We avoid "weight", "effective power", "units" and "√" in the UI. They are
accurate and nobody reads them the same way.

## 3. Mandate rules

| # | Rule | Implemented |
|---|---|---|
| R1 | **Only the owner grants.** Joining a child acuerdo shows its parent, and consent covers both by name. | Partly: one hop (R3) limits the chain; the join sheet does not name the parent yet. |
| R2 | **Scoped.** A mandate covers one proposal, one topic in one community, or one community. It never covers the non-delegable actions in `horizontal-governance-spec.md` (elections, rotations, config and constitution changes). | `mandateSpecificity` |
| R3 | **One hop.** A delegate cannot pass a lent voice on. | `MAX_DELEGATION_DEPTH = 1`; `delegateVoice` |
| R4 | **Revocable at any moment,** effective for every vote not yet closed. The 48 h cooldown only delays *joining the same acuerdo again* (anti flash-mob); it never delays leaving. | acuerdo `requestExit` |
| R5 | **Your own ballot wins.** If a lender votes, their ballot counts and the mandate does not, for that proposal. | `delegateVoice.overridden` |
| R6 | **Terms.** A proposal mandate ends when the proposal closes. A standing mandate (topic or community) lapses after **90 days** unless renewed with one tap. Lapsing releases the vote *without* a cooldown: nobody chose to leave. | `mandateLapsesAt`; acuerdo `renewLock`, lapse release |
| R7 | **Seen every time.** Before a standing mandate is used on a new proposal, the lender gets a notice ("tu voz irá con @ana en X") and can vote themselves or skip until close. A reminder goes 7 days before lapse. | Not yet (needs notifications). The cabildeo view already carries `gracePeriodEndsAt` / `delegateVoteDismissed` for this. |
| R8 | **One mandate speaks per person per proposal:** the most specific (proposal > topic > community), then the most recent. | `governingMandate` |
| R9 | **Cap: 10% of eligible members** (at least one person) per delegate per community. Refused at grant time when full; at tally time the oldest mandates are kept and the rest go back to their owners, who are told before close. | `mandateCap`, `delegateVoice.returned`; grant-time refusal not yet |
| R10 | **An acuerdo sees its count, not who left.** | Already true: locks are held by each member. |

Why the cap counts people and not share of the vote: a delegate must know
before the vote whether they are over it, and the share depends on turnout,
which is only known at close. People are known in advance. The share is still
shown (§6), and R9 is the check on it.

## 4. Quadratic voting: how mature it is

Be precise about this in every surface, because it is easy to oversell.

### 4.1 The idea

Quadratic voting (Lalley and Weyl, 2018; Posner and Weyl, *Radical Markets*)
lets each person express *how much* they care, at a rising price: a voice of
*k* costs *k²*. Caring twice as much costs four times as much, so people spend
intensity where it matters most to them. With honest, independent voters, the
result tracks how much people care in aggregate, which one-person-one-vote
cannot.

### 4.2 Outside PARA: experimental

- Its uses so far are mostly **advisory**: budget and priority exercises (the
  Colorado House Democratic caucus in 2019 is the best-known), hackathon
  judging, surveys. The closely related *quadratic funding* is used for
  grants. We know of no binding public election decided by QV. Check these
  references before quoting them externally.
- Its guarantees rest on assumptions a civic app must *earn*:
  1. **One person, one budget.** Splitting a budget across accounts is
     profitable: two accounts at voice 3 give 6 voices for 18 credits, one
     account gives 3. QV is *more* sybil-sensitive than a plain vote. m8's
     nullifier gives integrity, not anonymity (OD-7 §5a).
  2. **No collusion or vote buying.** Coordinated groups are the known weak
     point. Private ballots are the defence, and PARA does not have them yet.
  3. **Comprehension.** People misread budgets and squares. The UI (§6) is
     part of the mechanism, not decoration.
- **QV with delegation (QV-LD) has almost no theory or practice.** The rule in
  §5 is our design decision, argued below. It is not a known result, and it
  goes on the audit list.

### 4.3 Inside PARA: gated, in shadow

Verified against the code and OD-7 §5e:

- The tally is a **shadow**: `getTallySimulation` returns flat, √credits and
  a correlation-adjusted count with `shadowMode: true`. It is behind
  `para:quadratic_voting:enable`, which is off, and refuses with
  `BallotPrivacyUnavailable` even when on.
- Its inputs (`com.para.community.vote`, `.intensity`) are **frozen**. They put
  `voter` and `delegatedFrom` in public repos.
- The **correlation adjustment was never built**. Its snapshot table has no
  writer, so it always equalled the flat count.
- **The meaning of "units" disagreed.** The `intensity` lexicon calls units
  *credits* (1, 4, 9, 16). The composer treated units as *intensity* (1 to 16,
  costing up to 256), *in addition to* the -3..+3 signal. This PR removes the
  second knob: the signal's magnitude is the voice (§5).
- **No credit budget is defined.** There is no per-person, per-cycle number
  yet (§8).

### 4.4 Readiness ladder

| Level | What it means | Needs |
|---|---|---|
| **L0, explain and simulate** (this PR) | UI teaches the price; shadow numbers labelled "EN SOMBRA · No decide nada" | nothing further |
| L1, private linear ballot | one person, one vote, not in public repos | OD-7 §5a: commitments, nullifier from the credential |
| L2, private delegation | mandates not visible as a public graph | OD-7 §5b: rings, one-time addressing |
| L3, private quadratic | voice² proven under commitment | multiplication proof; audit of §5 |
| L4, binding QV | a community chooses QV for ordinary proposals | L3, a community vote, and a published comparison from the shadow period |

Until L4, every surface that shows a quadratic number carries the shadow badge.

## 5. Quadratic voice with mandates: the arithmetic

**Voice and price.** A ballot is a signal from -3 to +3. Its magnitude is the
voice; the price is voice² credits.

| Voice | Credits |
|---|---|
| 1 | 1 |
| 2 | 4 |
| 3 | 9 |

**Lent voices are priced one by one, on each lender's own budget.** A delegate
carrying *n* mandates casts

```
voices = own + Σ min(own, maxIntensityᵢ)      over lenders i within the cap
```

and each term costs lender *i* its own square. Two alternatives were rejected.

**Pooling** (the delegate spends √(Σ credits)) makes lending destroy voice:

| 25 people who care at voice 3 | Voices |
|---|---|
| each votes | 25 × 3 = **75** |
| they lend, and the credits are pooled | √(25 × 9) = **15** |

Pooling punishes trust fivefold here, and rewards the opposite: splitting one
person across accounts. Pricing lent voices per person keeps **lending
neutral**: it neither creates nor destroys voice. OD-7 §5b asks the same of the
private ballot ("delegated weight neither created nor destroyed").
`voice.test.ts` checks this example.

**Delegate-chosen intensity** (the delegate spends the lender's credits at
whatever voice they like) lets someone else drain your budget. So:

- **Intensity is not lent without permission.** A mandate carries
  `maxIntensity`, **1 by default**. The lender may raise it to 2 or 3 when they
  grant, and the credits come from them.
- A lent voice is never louder than the delegate's own ballot:
  `min(own, maxIntensity)`.
- A delegate who has not voted carries nothing, because there is no direction
  to follow.

**Relative power.** A delegate's share is `voices / all voices cast`. The card
(§6) shows it as a percentage and a bar, next to the number of people.

**Worked example: an acuerdo at "triple weight".** Three members agree to back
policy P strongly. Each grants a mandate scoped to P with `maxIntensity 3`,
reserving 9 of their own credits. The acuerdo's delegate votes +3. The result
is 3 + 3 + 3 + 3 = 12 voices (the delegate's own included), from four people
at 9 credits each.
- If one member takes their voice back the day before close, it is 9 voices.
- If one votes +1 themselves, their 1 voice counts on its own and the
  delegate carries 9.
- The mandate can persist across votes on P, renewed every 90 days, and stays
  theirs to take back.

## 6. Explaining it: the UI

**Principles**

- **One number, one row of people, one bar.** Everything else is a sentence.
- **Draw the price.** A voice of *k* is a *k×k* square of credits. The square
  *is* the quadratic rule, and needs no formula.
- **One control.** Direction and intensity are one choice (-3..+3). Two knobs
  for one quantity is how QV gets misunderstood.
- **People before power.** One dot is one person, so a delegate with 30 lenders
  visibly carries 30 people, not a "weight of 30".
- **Honest status.** "EN SOMBRA · No decide nada" wherever a quadratic number
  appears, until L4.
- **Never show:** √, "effective weight", decimals, or lenders' names (the card
  shows counts only).

**Vote composer** (`VoteComposer` + `IntensityScale`)

```
  -3  -2  -1   0  +1  +2  +3
              A favor

   ▪        ▪▪        ▪▪▪
            ▪▪        ▪▪▪
                      ▪▪▪
  1 voz    2 voces   3 voces
 1 crédito 4 créditos 9 créditos

    Este voto cuesta 4 de tus créditos.
```

**Delegate's voice** (`DelegatedVoiceCard`, proposal → Delegar)

```
 EN SOMBRA  No decide nada
 La voz de @green.rep en esta propuesta
 41 voces
 La suya y la de 32 personas que se la prestaron.
 ● ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○  +3
 █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
 14% de todas las voces de esta propuesta. Nadie puede llevar
 la voz de más de 40 personas.
 2 personas votaron por su cuenta: cuenta su voto, no este.
 Prestar tu voz no la multiplica ni la reduce: cada persona cuenta
 una vez, con la intensidad que ella misma autorizó y pagada con sus
 propios créditos. Puedes votar tú o retirarla hasta el cierre.
```

**Lender's notice (R7, to build)**

> Tu voz irá con **@ana** en *Paneles solares en azoteas* (voz 1, 1 crédito).
> **Votar yo** · **Esta vez no** · Cierra en 3 días.

**Acuerdo lock**: "Vigente hasta el 28/12/2026" · **Renovar 90 días** ·
**Salir ahora**. After leaving: "Saliste: tu voto ya no cuenta en este
acuerdo. Podrás volver a unirte en 48h."

**"How it works"** now says QV is being tested and decides nothing, that
lending is public today, and that the correlation adjustment is not built. The
previous text claimed three binding-adjacent tallies, including one that never
existed.

## 7. Privacy (CD-15, OD-7 §5b)

A standing mandate written to a public repo publishes *who trusts whom* for as
long as it stands. Deleting it later does not recall copies already relayed.
The longer the term, the longer the link is public, which is the opposite of
"leave no trace" (CD-15). Until L2:

- the grant sheet must say plainly that the mandate is public;
- the delegate card shows counts, never lenders;
- proposal mandates (short-lived) are the default; standing mandates are the
  opt-in.

## 8. Open questions

1. **Credit budget:** credits per person per cycle, and the cycle length.
   Proposal: set per community, with one shared default chosen from the
   shadow data.
2. **Cap value:** 10% is a starting point. Should small communities (under 20
   members) get a floor of 2?
3. **Cap basis:** people (as here) or share of the vote. See §3.
4. **Reserve or debit:** is a lender's `maxIntensity` reserved at grant, or
   only debited when used?
5. **Audit (with the ZK audit, `mubEZ/docs/ZK_AUDIT_RFP.md`):** neutrality of
   per-person pricing under delegation, the collusion surface of standing
   mandates, and the L3 multiplication proof.
