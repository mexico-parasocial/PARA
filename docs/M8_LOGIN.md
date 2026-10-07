# M8 login from PARA

2026-10-05 implementation candidate. Start with
[the canonical pilot queue](../../WatZappa/docs/QUARTER_PLAN_2026Q4.md) and
[the broker rollout contract](../../mubEZ/docs/PARA_OAUTH_HANDOFF.md).
Real provider/device/staging acceptance is still open.

The Identity Hub's Connect action calls `connectM8SessionFor` for the current
PARA DID. Native uses Expo's auth browser and `para://m8-auth`; web uses a
full-page authorization round trip to its own `/m8-auth`. The broker must
allowlist both selected callbacks and enable the handoff feature with dev
bootstrap off. Native/browser callbacks exchange the code automatically;
there is no manual status-check step or independent handle entry.

The pending grant stores the DID, attempt, exact callback, deadline and private
PKCE verifier. Broker start/exchange responses must match those bindings before
credential storage. Account changes and logout invalidate unfinished grants
synchronously. Only explicit Connect opens a browser; local development can
still use immediate bootstrap through `ensureM8SessionFor`.

Native release builds require SecureStore; they do not downgrade wallet
credentials to AsyncStorage. Web bearer credentials live in memory, with only
the temporary callback binding/error in the originating tab's sessionStorage.
The web callback completes after persisted-account initialization, strips its
query before exchange and restores an internal route before the router mounts.
It does not reload the new in-memory grant. A later page reload requires
reconnecting; persistent web sessions are not implemented by this change.

Refresh saves both rotated credentials and shares concurrent requests.
Disconnect and PARA logout clear local credentials first and request broker
refresh-family revocation. Offline revocation can fail, and existing access
JWTs expire normally. M8 credentials authenticate the broker/bridge; Matrix's
MAS/OIDC access and refresh credentials remain a separate session.

Do not restart the completed callback implementation. Next: deploy the paired
broker migration/configuration, resolve release build blockers, and record real
provider login, cancellation/back, replay/expiry, account switching, refresh,
logout and native secure-storage results on the supported pilot clients.
