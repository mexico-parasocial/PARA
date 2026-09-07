# PARA fork of indigo

Live fork. `bskyweb/` builds against this tree via a `replace` directive
(`bskyweb/go.mod`), not the upstream module proxy. Keep it building.

## Layout additions vs upstream

- `lexicons/com/para/` — mirror of the canonical `com.para` lexicons.
  **Do not edit here.** Single source of truth is WatZappa
  (`<repo-root>/../WatZappa/lexicons/com/para/`).
- `cmd/lexgen/para.json` — lexgen build file for the future `api/para`
  Go SDK (Phase 2). Not wired into `gen/main.go` CBOR yet.
- `gen/main.go` — PARA additions to the CBOR type list are marked by
  proximity to the upstream entries (`EmbedGallery`, visibility/opt-out
  types). Keep them sorted with their neighbors when rebasing.

## Commands (run inside `indigo-main/`)

```bash
go build ./...            # whole tree must stay green
go run ./cmd/lexgen/ --build-file cmd/lexgen/bsky.json ./lexicons  # make lexgen
go run ./gen              # make cborgen (CBOR helpers)
```

Full upstream-sync flow when adding a lexicon with new record types:

1. Add/update the lexicon JSON under `lexicons/`.
2. `make lexgen` (writes `api/*` type files).
3. Add new record types to the lists in `gen/main.go`.
4. `make cborgen`.
5. `go build ./...` in both `indigo-main/` and `../bskyweb`, plus
   `go test ./...` in `../bskyweb`.

Cycle-breaker: if step 2 emits union CBOR methods that reference not-yet-
generated inner-type methods (package won't compile for step 4), add
temporary stubs for the missing `MarshalCBOR`/`UnmarshalCBOR` methods,
run `go run ./gen`, then delete the stub file. Never commit stubs.

## Sync scripts (run from repo root)

```bash
./scripts/sync-indigo-para-lexicons.sh          # WatZappa -> lexicons/com/para
./scripts/sync-indigo-para-lexicons.sh --check  # CI drift gate (lexicons + api match)
```

## Upstream sync cadence

Active fork: rebase onto `bluesky-social/indigo@main` monthly (or when
`bskyweb` needs a new upstream API). Process:

1. Shallow-clone upstream to /tmp, diff `lexicons/{app,chat,tools,com}`.
2. Adopt changed union/defs JSONs **only together with** their generated
   `api/*` counterparts — never JSONs alone (breaks union codegen).
3. Re-run `make lexgen`, update `gen/main.go`, `make cborgen`.
4. `go build ./...` here and in `bskyweb/`; `go test ./...` in `bskyweb/`.
5. Record the upstream commit hash in the sync commit message.

## Non-goals

- No Go AppView/PDS/search reimplementation. WatZappa (TypeScript) is the
  indexer of record. Go consumes the firehose (tap/netsync) for bots,
  backfill, and moderation tooling only.
- No forks of `repo/`, `mst/`, `carstore/`, `atproto/syntax` primitives.
  Stay on upstream behavior there.
