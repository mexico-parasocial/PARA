FROM golang:1.27-bookworm AS build-env

WORKDIR /usr/src/social-app

ENV DEBIAN_FRONTEND=noninteractive

#
# Node
#
ENV NODE_VERSION=24.18.0
ENV NVM_DIR=/usr/share/nvm

#
# Go
#
ENV GODEBUG="netdns=go"
ENV GOOS="linux"
ENV GOARCH="amd64"
ENV CGO_ENABLED=1
ENV GOEXPERIMENT="loopvar"

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

# The PARA platform this build talks to. PARA_DOMAIN derives every service
# URL the way para-platform publishes them (pds., appview., m8., bridge.,
# idp.); any EXPO_PUBLIC_* passed explicitly wins. Without PARA_DOMAIN the
# app keeps its built-in defaults, which point at Bluesky's services.
ARG PARA_DOMAIN
ARG EXPO_PUBLIC_DEFAULT_SERVICE
ARG EXPO_PUBLIC_BLUESKY_PROXY_DID
ARG EXPO_PUBLIC_CHAT_PROXY_DID
ARG EXPO_PUBLIC_M8_BROKER_URL
ARG EXPO_PUBLIC_MATRIX_BRIDGE_URL
ARG EXPO_PUBLIC_MATRIX_IDP_URL
ARG EXPO_PUBLIC_MATRIX_PUSH_GATEWAY_URL
ARG EXPO_PUBLIC_MATRIX_DMS

#
# Copy everything into the container
#
COPY . .

#
# Generate the JavaScript webpack.
#
RUN mkdir --parents $NVM_DIR && \
  wget \
    --output-document=/tmp/nvm-install.sh \
    https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh && \
  bash /tmp/nvm-install.sh

RUN \. "$NVM_DIR/nvm.sh" && \
  nvm install $NODE_VERSION && \
  nvm use $NODE_VERSION && \
  echo "Using bundle identifier: $EXPO_PUBLIC_BUNDLE_IDENTIFIER" && \
  echo "EXPO_PUBLIC_ENV=$EXPO_PUBLIC_ENV" >> .env && \
  echo "EXPO_PUBLIC_RELEASE_VERSION=$EXPO_PUBLIC_RELEASE_VERSION" >> .env && \
  echo "EXPO_PUBLIC_BUNDLE_IDENTIFIER=$EXPO_PUBLIC_BUNDLE_IDENTIFIER" >> .env && \
  echo "EXPO_PUBLIC_BUNDLE_DATE=$(date -u +"%y%m%d%H")" >> .env && \
  echo "EXPO_PUBLIC_SENTRY_DSN=$EXPO_PUBLIC_SENTRY_DSN" >> .env && \
  if [ -n "$PARA_DOMAIN" ]; then \
    echo "EXPO_PUBLIC_DEFAULT_SERVICE=${EXPO_PUBLIC_DEFAULT_SERVICE:-https://pds.$PARA_DOMAIN}" >> .env && \
    echo "EXPO_PUBLIC_BLUESKY_PROXY_DID=${EXPO_PUBLIC_BLUESKY_PROXY_DID:-did:web:appview.$PARA_DOMAIN}" >> .env && \
    echo "EXPO_PUBLIC_M8_BROKER_URL=${EXPO_PUBLIC_M8_BROKER_URL:-https://m8.$PARA_DOMAIN}" >> .env && \
    echo "EXPO_PUBLIC_MATRIX_BRIDGE_URL=${EXPO_PUBLIC_MATRIX_BRIDGE_URL:-https://bridge.$PARA_DOMAIN}" >> .env && \
    echo "EXPO_PUBLIC_MATRIX_IDP_URL=${EXPO_PUBLIC_MATRIX_IDP_URL:-https://idp.$PARA_DOMAIN}" >> .env && \
    echo "EXPO_PUBLIC_MATRIX_PUSH_GATEWAY_URL=${EXPO_PUBLIC_MATRIX_PUSH_GATEWAY_URL:-https://bridge.$PARA_DOMAIN/_matrix/push/v1/notify}" >> .env; \
  fi && \
  if [ -n "$EXPO_PUBLIC_CHAT_PROXY_DID" ]; then echo "EXPO_PUBLIC_CHAT_PROXY_DID=$EXPO_PUBLIC_CHAT_PROXY_DID" >> .env; fi && \
  if [ -n "$EXPO_PUBLIC_MATRIX_DMS" ]; then echo "EXPO_PUBLIC_MATRIX_DMS=$EXPO_PUBLIC_MATRIX_DMS" >> .env; fi && \
  npm install --global pnpm@11.11.0 && \
  pnpm install && \
  pnpm intl:build 2>&1 | tee i18n.log && \
  if grep -q "invalid syntax" "i18n.log"; then echo "\n\nFound compilation errors!\n\n" && exit 1; else echo "\n\nNo compile errors!\n\n"; fi && \
  SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN SENTRY_RELEASE=$EXPO_PUBLIC_RELEASE_VERSION SENTRY_DIST=$EXPO_PUBLIC_BUNDLE_IDENTIFIER pnpm build-web

# DEBUG
RUN find ./bskyweb/static && find ./web-build/static

#
# Generate the bskyweb Go binary.
#
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

FROM debian:bookworm-slim

ENV GODEBUG=netdns=go
ENV TZ=Etc/UTC
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install --yes \
  dumb-init \
  ca-certificates

ENTRYPOINT ["dumb-init", "--"]

WORKDIR /bskyweb
COPY --from=build-env /bskyweb /usr/bin/bskyweb

CMD ["/usr/bin/bskyweb"]

LABEL org.opencontainers.image.source=https://github.com/TinoMachino/final
LABEL org.opencontainers.image.description="PARA Web App"
LABEL org.opencontainers.image.licenses=MIT
