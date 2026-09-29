# Revocable mandates and weighted votes

> Status: **decided.** The mandate rules (§3) and the ballot model (§4) apply
> now. Weighted policy ballots stay frozen until the private ballot exists
> (OD-7 §5c), so the policy screens remain in shadow.
>
> Code: `src/lib/mandates/mandates.ts` (arithmetic, tested),
> `src/state/shell/acuerdos.tsx` (locks),
> `src/screens/Agora/components/{DelegateReachCard,VoteComposer}.tsx` (UI).

## 1. Why

`horizontal-governance-spec.md` says delegation is opt-in per proposal, one
hop, expires after each proposal, and has no permanent delegates. It comes from
_revocación en cualquier momento_ and _rotatividad de cargos_: nobody should
hold power that the people who lent it cannot take back.

The acuerdo code broke that in three ways:

1. **Leaving did not release the vote.** `requestExit` stamped a 48 h cooldown
   and never removed the lock or lowered `lockedCount`.
2. **Locks never ended.** Every lock had `expiresAt: null`.
3. **Other people chose the chain.** `parentAcuerdo` is set by whoever creates
   the child acuerdo; members of the child were carried into the parent.

A delegation that _persists_ is not the problem. A delegation that the person
did not choose, cannot see being used, or cannot take back is. So the rule
becomes:

> **A delegation may persist, but only if the person chose it, can revoke it
> at any moment with immediate effect, and sees it every time it is used.**

We call such a delegation a **mandate** (_mandato_), as in _mandar
obedeciendo_: lent, scoped, and taken back at will.

## 2. Words

The UI uses these words and no others.

| Word                                 | Meaning                                                  |
| ------------------------------------ | -------------------------------------------------------- |
| **voto** (vote)                      | One person's ballot. Everyone has exactly one.           |
| **señal** (signal)                   | On a policy, how much the vote weighs: -3 to +3.         |
| **prestar tu voto** (lend your vote) | Grant a mandate.                                         |
| **retirar** (take back)              | Revoke a mandate.                                        |
| **tope** (cap)                       | The most people whose votes one delegate may carry.      |

There are no credits, budgets or prices. We avoid "weight", "effective power",
"units" and "√" in the UI.

## 3. Mandate rules

| #   | Rule                                                                                                                                                                                                                                       | Implemented                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| R1  | **Only the owner grants.** Joining a child acuerdo shows its parent, and consent covers both by name.                                                                                                                                      | Partly: one hop (R3) limits the chain; the join sheet does not name the parent yet.                                     |
| R2  | **Scoped.** A mandate covers one proposal, one topic in one community, or one community. It never covers the non-delegable actions in `horizontal-governance-spec.md` (elections, rotations, config and constitution changes).             | `mandateSpecificity`                                                                                                    |
| R3  | **One hop.** A delegate cannot pass a lent vote on.                                                                                                                                                                                        | `MAX_DELEGATION_DEPTH = 1`; `delegateReach`                                                                             |
| R4  | **Revocable at any moment,** effective for every vote not yet closed. The 48 h cooldown only delays _joining the same acuerdo again_ (anti flash-mob); it never delays leaving.                                                            | acuerdo `requestExit`                                                                                                   |
| R5  | **Your own ballot wins.** If a lender votes, their ballot counts and the mandate does not, for that subject.                                                                                                                              | `delegateReach.overridden`                                                                                              |
| R6  | **Terms.** A proposal mandate ends when the proposal closes. A standing mandate (topic or community) lapses after **90 days** unless renewed with one tap. Lapsing releases the vote _without_ a cooldown: nobody chose to leave.         | `mandateLapsesAt`; acuerdo `renewLock`, lapse release                                                                   |
| R7  | **Seen every time.** Before a standing mandate is used on a new subject, the lender gets a notice ("tu voto irá con @ana en X") and can vote themselves or skip until close. A reminder goes 7 days before lapse.                         | Not yet (needs notifications). The cabildeo view already carries `gracePeriodEndsAt` / `delegateVoteDismissed` for it. |
| R8  | **One mandate speaks per person per subject:** the most specific (proposal > topic > community), then the most recent.                                                                                                                    | `governingMandate`                                                                                                      |
| R9  | **Cap: 10% of eligible members** (at least one person) per delegate per community. Refused at grant time when full; at tally time the oldest mandates are kept and the rest go back to their owners, who are told before close.           | `mandateCap`, `delegateReach.returned`; grant-time refusal not yet                                                      |
| R10 | **An acuerdo sees its count, not who left.**                                                                                                                                                                                               | Already true: locks are held by each member.                                                                            |

The cap counts people, not share of the vote, because a delegate must know
before the vote whether they are over it, and the share depends on turnout.
The share is still shown (§6).

## 4. What a vote is

**Decided 2026-09-29: no credits. One person, one vote.**

| Subject      | Ballot                                   | Weighted | Tally                                                 | Writable today                                  |
| ------------ | ---------------------------------------- | -------- | ----------------------------------------------------- | ----------------------------------------------- |
| **Policy**   | a signal from -3 to +3                   | yes      | sum and average of signals, with a 7-bucket breakdown (`getPolicyTally`) | no: `signal` is refused on write (OD-7 §5c)     |
| **Cabildeo** | one option (`selectedOption`), in favour | no       | votes per option                                      | yes, and public and attributable (OD-7 §5d)     |

- **Policies are the only weighted ballots.** +3 adds three times what +1
  does; 0 counts the voter towards quorum without moving the result.
- **A cabildeo vote is only ever in favour of one option.** It has no weight
  and no "against". This is what the code already does.
- **Other subjects** (`matter`, `governance`) are not covered here. Decide
  their ballot before any of them becomes writable.

### 4.1 Quadratic voting: considered, not adopted

Quadratic voting prices intensity: a vote of weight _k_ costs _k²_ credits
from a budget, so people spend weight where it matters most to them. It was
the design behind the `com.para.community.intensity` lexicon and the shadow
tally (OD-7 §5e). It is not adopted. The reasons, for the record:

- **It is immature.** Its uses so far are mostly advisory (budget and priority
  exercises), and quadratic voting combined with delegation has almost no
  theory or practice behind it.
- **It needs a budget,** and a budget is one more thing to explain, to set,
  and to protect from splitting across accounts.
- **Its privacy is the hardest case.** Proving _k²_ under commitment is a
  multiplication proof (OD-7 §5b).

What this gives up: weight is free. With no price, a voter who cares a little
can still vote +3, so the signal measures conviction only as honestly as
people give it. Two mitigations are cheap, and the policy screens should keep
them:

1. **Show the breakdown, not only the average.** The 7-bucket distribution
   shows whether a +1.3 average is broad mild support or a split between +3
   and -3. `getPolicyTally.breakdown` already carries it.
2. **Name the outcome by the distribution.** `getPolicyTally.outcome` already
   has `contested` for that.

The shadow tally (`getTallySimulation`: flat, √credits, correlation) and the
`intensity` lexicon belong to the design that was not adopted. They stay gated
off. Retiring them is a follow-up, and needs its own change.

## 5. Delegation arithmetic

**A lent vote casts the delegate's ballot, once, for the person who lent it.**

- On a policy it carries the delegate's signal: if the delegate votes +2,
  each lent vote adds +2.
- On a cabildeo it goes to the delegate's option.
- Each person still counts exactly once. Lending neither adds votes nor
  removes them.
- A delegate who has not voted casts nothing, because there is no ballot to
  copy.

A delegate's **reach** is their own vote plus the lent votes they cast, within
the cap. Their **share** is `reach / all votes counted` on the subject
(`delegateReach`).

**Worked example: an acuerdo that backs a policy at "triple weight".** Three
members lend their votes, scoped to policy P, to the acuerdo's delegate, who
votes +3.
- The delegate's choice decides 4 votes, adding +12 to P's sum.
- If one member takes their vote back the day before close, it decides 3 votes
  (+9).
- If one member votes +1 themselves, their +1 counts on its own, and the
  delegate decides 3 votes.
- The mandate can persist across votes on P, renewed every 90 days, and stays
  theirs to take back.

## 6. Explaining it: the UI

**Principles**

- **One number, one row of people, one bar.** Everything else is a sentence.
- **People before power.** One dot is one person, so a delegate with 30
  lenders visibly carries 30 people.
- **One control on policies.** Direction and weight are one choice (-3..+3),
  with one sentence saying what it adds. There is no second intensity knob.
- **Honest status.** A policy screen shows "EN SOMBRA · No decide nada" until
  its ballots are writable.
- **Never show:** credits, √, "effective weight", decimals, or lenders' names.

**Policy ballot** (`VoteComposer`)

```
  -3  -2  -1   0  +1  +2  +3
              A favor
  Tu voto suma +2 al conteo: +3 pesa el triple que +1.
```

**A delegate's reach** (`DelegateReachCard`, proposal → Delegar)

```
 EN SOMBRA  No decide nada
 El voto de @green.rep en esta propuesta
 33 votos
 El suyo y el de 32 personas que se lo prestaron.
 ● ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○  +3
 ███████████░░░░░░░░░░░░░░░░░░░░░░░░░░
 22% de los votos de esta propuesta. Nadie puede llevar el voto
 de más de 40 personas.
 2 personas votaron por su cuenta: cuenta su voto, no este.
 Cada voto prestado lleva la misma señal que el de @green.rep, de −3
 a +3, y cuenta una vez por persona. Puedes votar tú o retirarlo
 hasta el cierre.
```

On a cabildeo, the last sentence reads: "Cada voto prestado va a la opción que
elija @ana y cuenta una vez por persona." There is no shadow badge, because
cabildeo ballots are live.

**Lender's notice (R7, to build)**

> Tu voto irá con **@ana** en _Paneles solares en azoteas_.
> **Votar yo** · **Esta vez no** · Cierra en 3 días.

**Acuerdo lock**: "Vigente hasta el 28/12/2026" · **Renovar 90 días** ·
**Salir ahora**. After leaving: "Saliste: tu voto ya no cuenta en este
acuerdo. Podrás volver a unirte en 48h."

## 7. Privacy (CD-15, OD-7 §5b)

A standing mandate written to a public repo publishes _who trusts whom_ for as
long as it stands. Deleting it later does not recall copies already relayed.
The longer the term, the longer the link is public, which is the opposite of
"leave no trace" (CD-15). Until private delegation (OD-7 §5b):

- the grant sheet must say plainly that the mandate is public;
- the delegate card shows counts, never lenders;
- proposal mandates (short-lived) are the default; standing mandates are the
  opt-in.

## 8. Open questions

1. **Cap value:** 10% is a starting point. Should small communities (under 20
   members) get a floor of 2?
2. **Cabildeo delegate screen:** `listDelegationCandidates` already returns
   each candidate's `activeDelegationCount`, and the cabildeo view has
   `voteTotals`. The reach bar could show there with live data once the
   AppView applies R5 (overrides) and R9 (cap).
3. **Ballots for `matter` and `governance`** (§4).
4. **Retire the quadratic experiment** (§4.1).
