import pytest
from fastapi.testclient import TestClient
from src.verify_service import app, REVOCATION_REGISTRY, MERKLE_ROOT, _rebuild_merkle_tree

client = TestClient(app)

def make_presentation(credential_id="cred-001", revealed_claims=None, expires_at=None):
    import time
    return {
        "presentation": {
            "credentialId": credential_id,
            "encryptedPayload": "encrypted:mock",
            "nonce": "nonce:test",
            "expiresAt": expires_at or int(time.time() * 1000) + 300_000,
            "revealedClaims": revealed_claims or ["ageOver18", "citizenship"],
        },
        "options": {},
    }

# ─── /verify ─────────────────────────────────────────────────────────────────

def test_verify_valid_presentation():
    response = client.post("/verify", json=make_presentation())
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["credentialId"] == "cred-001"
    assert data["issuerDid"] == "did:m8:ine:emisor-001"
    assert "ageOver18" in data["verifiedClaims"]
    assert data["mode"] == "online"

def test_verify_expired_presentation():
    response = client.post("/verify", json=make_presentation(expires_at=1000))
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert any("Presentation expired" in e for e in data["errors"])

def test_verify_invalid_payload():
    payload = make_presentation()
    payload["presentation"]["encryptedPayload"] = "invalid"
    response = client.post("/verify", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert any("Invalid payload" in e for e in data["errors"])

# ─── /revocation-check ───────────────────────────────────────────────────────

def test_revocation_check_not_revoked():
    response = client.get("/revocation-check/abc123notreal")
    assert response.status_code == 200
    data = response.json()
    assert data["revoked"] is False

def test_revocation_check_revoked():
    # First revoke a credential
    revoke_resp = client.post(
        "/admin/revoke?credential_id=cred-to-revoke&revoked_by=did:m8:ine:emisor-001",
        headers={"x-admin-token": "dev-admin-token"},
    )
    assert revoke_resp.status_code == 200

    import hashlib
    revocation_hash = hashlib.sha256(b"cred-to-revoke").hexdigest()

    response = client.get(f"/revocation-check/{revocation_hash}")
    assert response.status_code == 200
    data = response.json()
    assert data["revoked"] is True
    assert data["revokedBy"] == "did:m8:ine:emisor-001"

# ─── /merkle-root ───────────────────────────────────────────────────────────

def test_merkle_root_empty():
    # Clear registry
    REVOCATION_REGISTRY.clear()
    MERKLE_ROOT = None
    response = client.get("/merkle-root")
    assert response.status_code == 200
    data = response.json()
    assert data["entryCount"] == 0

def test_merkle_root_with_entries():
    # Revoke something to populate tree
    client.post(
        "/admin/revoke?credential_id=cred-merkle-test&revoked_by=did:m8:ine:emisor-001",
        headers={"x-admin-token": "dev-admin-token"},
    )
    response = client.get("/merkle-root")
    assert response.status_code == 200
    data = response.json()
    assert data["entryCount"] >= 1
    assert len(data["root"]) == 64  # SHA-256 hex

# ─── /admin/revoke ───────────────────────────────────────────────────────────

def test_revoke_without_token():
    response = client.post("/admin/revoke?credential_id=cred-test")
    assert response.status_code == 401

def test_revoke_with_bad_token():
    response = client.post(
        "/admin/revoke?credential_id=cred-test",
        headers={"x-admin-token": "wrong-token"},
    )
    assert response.status_code == 401

def test_revoke_success():
    response = client.post(
        "/admin/revoke?credential_id=cred-new-revoke&revoked_by=did:m8:ine:emisor-001",
        headers={"x-admin-token": "dev-admin-token"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["revoked"] is True
    assert len(data["revocationHash"]) == 64

# ─── /metrics ───────────────────────────────────────────────────────────────

def test_metrics():
    response = client.get("/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "revokedCredentials" in data

# ─── /health ────────────────────────────────────────────────────────────────

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "revocationRegistrySize" in data

# ─── Integration: verify revoked credential ──────────────────────────────────

def test_verify_revoked_credential():
    # Revoke first
    client.post(
        "/admin/revoke?credential_id=cred-revoked-verify&revoked_by=did:m8:ine:emisor-001",
        headers={"x-admin-token": "dev-admin-token"},
    )

    response = client.post("/verify", json=make_presentation("cred-revoked-verify"))
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert any("revoked" in e.lower() for e in data["errors"])
