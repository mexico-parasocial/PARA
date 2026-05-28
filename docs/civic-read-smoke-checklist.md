# Civic Read Backbone Smoke Checklist

Date baseline: March 16, 2026

## 1. Community Profile

- Open `CommunityProfile` from a seeded community.
- Verify posts feed renders and pull-to-refresh works.
- Open `About` tab and confirm governance status message is one of:
  - loading
  - published record summary
  - explicit no-record state
  - explicit error + retry

## 2. Community Badges

- Open `CommunityBadges` for the same community.
- Confirm badge sections load from real post search results.
- Confirm governance status card shows loading/published/no-record/error.
- If governance fetch fails, use `Retry governance` and confirm re-fetch.

## 3. Open Questions

- Open `OpenQuestionsList`.
- Confirm no runtime fallback data is injected when network returns zero results.
- Validate all three states:
  - loading placeholder
  - error placeholder with retry
  - empty placeholder with no questions
- Open one question and verify navigation goes to `PostThread`.

## 4. Cabildeo List/Detail

- Open `CabildeoList` and validate:
  - loading/error/empty placeholders
  - community filter pills still work
  - cards navigate by `cabildeoUri` (not index)
- Open one card and validate `CabildeoDetail`:
  - detail loads by `cabildeoUri`
  - missing/deleted URI shows explicit unavailable state
  - positions section has loading/error/empty handling

## 5. Delegate + Position Flows

- From `CabildeoDetail`, tap `Delegar mi voto` and verify route receives `cabildeoUri`.
- Confirm `DelegateVote` handles loading/error/not-found states.
- From detail, tap `+ Posición` and verify `CreatePosition` receives same `cabildeoUri`.

## 6. Partial Failure / Latency

- Simulate delayed responses (network throttling) and confirm placeholders stay visible, not stale mock content.
- Simulate temporary AppView failure and verify retry affordances on:
  - Open Questions list
  - Cabildeo detail/list
  - Community governance status cards
