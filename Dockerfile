#
# Stage 1: build the web bundle with pnpm.
#
# Uses the official pnpm image. Node is auto-downloaded by pnpm using the
# `devEngines.runtime` field in package.json (onFail: "download").
#
FROM ghcr.io/pnpm/pnpm:11 AS web-build

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive

#
# pnpm config
#
ENV CI=1
# use the pnpm version specified in package.json
ENV pnpm_config_pm_on_fail=download

# Metro's web export needs far more heap than Node's default (~1GB in the
# container), which crashes the bundle step with a V8 OOM.
ENV NODE_OPTIONS="--max-old-space-size=8192"

# The latest git hash of the preview branch on render.com
# https://render.com/docs/docker-secrets#environment-variables-in-docker-builds
ARG RENDER_GIT_COMMIT

#
# Expo
#
ARG EXPO_PUBLIC_ENV
ENV EXPO_PUBLIC_ENV=${EXPO_PUBLIC_ENV:-development}
ARG EXPO_PUBLIC_RELEASE_VERSION
ENV EXPO_PUBLIC_RELEASE_VERSION=$EXPO_PUBLIC_RELEASE_VERSION
ARG EXPO_PUBLIC_BUNDLE_IDENTIFIER
# If not set by GitHub workflows, we're probably in Render
ENV EXPO_PUBLIC_BUNDLE_IDENTIFIER=${EXPO_PUBLIC_BUNDLE_IDENTIFIER:-$RENDER_GIT_COMMIT}

#
# Sentry
#
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN:-unknown}
ARG EXPO_PUBLIC_SENTRY_DSN
ENV EXPO_PUBLIC_SENTRY_DSN=$EXPO_PUBLIC_SENTRY_DSN

COPY . .

# PARA: unlike upstream, the working tree carries a machine-local, gitignored
# `.env` (written by sync-local-dev-env.js with Bonjour hosts, LAN IPs, and
# dev-env proxy DIDs) and `.env.local` (EXPO_PUBLIC_USE_LOCAL_DEV_SERVICE=1).
# Expo gives .env.local priority, so shipping either into the image would bake
# local-dev endpoints into the production bundle. CI/Render checkouts never
# have these files; delete them so the build env matches CI exactly. The
# pnpm-workspace.yaml network settings work around pnpm's default fetch
# timeout aborting installs when container networking to the npm registry is
# slow (observed on Docker Desktop); pnpm 11 reads these keys only from the
# workspace yaml, and upstream's CI network never needs them, so they are
# appended here rather than committed to the repo.
RUN rm -f .env .env.local && \
  printf 'fetchTimeout: 300000\nfetchRetries: 6\n' >> pnpm-workspace.yaml && \
  echo "Using bundle identifier: $EXPO_PUBLIC_BUNDLE_IDENTIFIER" && \
  echo "EXPO_PUBLIC_ENV=$EXPO_PUBLIC_ENV" >> .env && \
  echo "EXPO_PUBLIC_RELEASE_VERSION=$EXPO_PUBLIC_RELEASE_VERSION" >> .env && \
  echo "EXPO_PUBLIC_BUNDLE_IDENTIFIER=$EXPO_PUBLIC_BUNDLE_IDENTIFIER" >> .env && \
  echo "EXPO_PUBLIC_BUNDLE_DATE=$(date -u +"%y%m%d%H")" >> .env && \
  echo "EXPO_PUBLIC_SENTRY_DSN=$EXPO_PUBLIC_SENTRY_DSN" >> .env

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

RUN pnpm intl:build 2>&1 | tee i18n.log && \
  if grep -q "invalid syntax" "i18n.log"; then echo "\n\nFound compilation errors!\n\n" && exit 1; else echo "\n\nNo compile errors!\n\n"; fi

RUN SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN \
    SENTRY_RELEASE=$EXPO_PUBLIC_RELEASE_VERSION \
    SENTRY_DIST=$EXPO_PUBLIC_BUNDLE_IDENTIFIER \
    pnpm build-web

#
# Stage 2: build the bskyweb Go binary, embedding the assets from stage 1.
#
# post-web-build.js (run by `pnpm build-web`) writes the bundled JS/CSS/media
# into bskyweb/static/* and regenerates bskyweb/templates/scripts.html, so
# copying the bskyweb/ tree from stage 1 is enough for go:embed to find
# everything.
#
FROM golang:1.26-bookworm AS go-build

WORKDIR /usr/src/social-app

ENV GODEBUG="netdns=go"
ENV GOOS="linux"
ENV GOARCH="amd64"
ENV CGO_ENABLED=1
ENV GOEXPERIMENT="loopvar"

COPY --from=web-build /app/bskyweb ./bskyweb

# DEBUG
RUN find ./bskyweb/static

RUN cd bskyweb/ && \
  go mod download && \
  go mod verify

RUN cd bskyweb/ && \
  go build \
    -v  \
    -trimpath \
    -tags timetzdata \
    -o /bskyweb \
    ./cmd/bskyweb

#
# Stage 3: runtime image.
#
FROM debian:bookworm-slim

ENV GODEBUG=netdns=go
ENV TZ=Etc/UTC
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install --yes \
  dumb-init \
  ca-certificates

ENTRYPOINT ["dumb-init", "--"]

WORKDIR /bskyweb
COPY --from=go-build /bskyweb /usr/bin/bskyweb

CMD ["/usr/bin/bskyweb"]

LABEL org.opencontainers.image.source=https://github.com/TinoMachino/final
LABEL org.opencontainers.image.description="PARA Web App"
LABEL org.opencontainers.image.licenses=MIT
