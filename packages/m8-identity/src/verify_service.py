from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import hashlib
import time
from datetime import datetime, timezone

app = FastAPI(title="m8 Verify Service", version="1.0.0")

# ─── In-memory revocation registry (replace with DB in prod) ───────────────

REVOCATION_REGISTRY: Dict[str, dict] = {}
MERKLE_ROOT: Optional[str] = None

# ─── Models ─────────────────────────────────────────────────────────────────

class PresentationBundle(BaseModel):
    credentialId: str
    encryptedPayload: str
    nonce: str
    expiresAt: int
    revealedClaims: List[str]

class VerifyRequest(BaseModel):
    presentation: PresentationBundle
    options: Optional[dict] = None

class VerifyResponse(BaseModel):
    valid: bool
    credentialId: str
    issuerDid: str
    verifiedClaims: dict
    errors: List[str]
    warnings: List[str]
    verifiedAt: int
    mode: str = "online"
    revocationProof: Optional[dict] = None

class RevocationCheckResponse(BaseModel):
    revoked: bool
    credentialId: str
    revocationHash: str
    revokedAt: Optional[str] = None
    revokedBy: Optional[str] = None

class MerkleRootResponse(BaseModel):
    root: str
    updatedAt: str
    entryCount: int

class MetricsResponse(BaseModel):
    totalVerifications: int
    successfulVerifications: int
    failedVerifications: int
    revokedCredentials: int
    averageResponseMs: float

# ─── Verification endpoint ─────────────────────────────────────────────────

@app.post("/verify", response_model=VerifyResponse)
async def verify_presentation(req: VerifyRequest):
    """
    Verify a credential presentation online.
    Checks: expiry, signature (mock), revocation status.
    """
    start = time.time()
    bundle = req.presentation
    now = int(time.time() * 1000)
    errors = []
    warnings = []

    # 1. Check presentation expiry
    if bundle.expiresAt < now:
        errors.append("Presentation expired")

    # 2. Mock signature verification (TODO: real RSA/Ed25519 verify)
    if not bundle.encryptedPayload.startswith("encrypted:"):
        errors.append("Invalid payload format")

    # 3. Mock parse payload (TODO: real decryption)
    payload = _mock_parse_payload(bundle.encryptedPayload)
    if not payload:
        errors.append("Failed to parse payload")
        return _error_response(bundle.credentialId, errors, warnings, start)

    # 4. Check credential expiry
    if payload.get("expiresAt") and _parse_iso(payload["expiresAt"]) < datetime.now(timezone.utc):
        errors.append("Credential expired")

    # 5. Check revocation
    revocation_hash = _hash_credential_id(bundle.credentialId)
    revoked = revocation_hash in REVOCATION_REGISTRY

    if revoked:
        entry = REVOCATION_REGISTRY[revocation_hash]
        errors.append(f"Credential revoked at {entry['revokedAt']} by {entry['revokedBy']}")

    # 6. Filter revealed claims
    all_claims = payload.get("claims", {})
    verified_claims = {k: all_claims[k] for k in bundle.revealedClaims if k in all_claims}

    # 7. Build revocation proof (if not revoked)
    revocation_proof = None
    if not revoked and MERKLE_ROOT:
        revocation_proof = {
            "root": MERKLE_ROOT,
            "proof": [],  # TODO: actual Merkle proof
            "leafIndex": -1,
        }

    elapsed_ms = (time.time() - start) * 1000

    return VerifyResponse(
        valid=len(errors) == 0,
        credentialId=bundle.credentialId,
        issuerDid=payload.get("issuerDid", "unknown"),
        verifiedClaims=verified_claims,
        errors=errors,
        warnings=warnings,
        verifiedAt=now,
        mode="online",
        revocationProof=revocation_proof,
    )

# ─── Revocation check endpoint ─────────────────────────────────────────────

@app.get("/revocation-check/{revocation_hash}", response_model=RevocationCheckResponse)
async def check_revocation(revocation_hash: str):
    """
    Check if a credential is in the revocation registry.
    """
    revoked = revocation_hash in REVOCATION_REGISTRY
    entry = REVOCATION_REGISTRY.get(revocation_hash)

    return RevocationCheckResponse(
        revoked=revoked,
        credentialId=entry["credentialId"] if entry else "unknown",
        revocationHash=revocation_hash,
        revokedAt=entry.get("revokedAt") if entry else None,
        revokedBy=entry.get("revokedBy") if entry else None,
    )

# ─── Merkle root endpoint ──────────────────────────────────────────────────

@app.get("/merkle-root", response_model=MerkleRootResponse)
async def get_merkle_root():
    """
    Get current Merkle root of revocation registry.
    """
    global MERKLE_ROOT
    if not MERKLE_ROOT:
        _rebuild_merkle_tree()

    return MerkleRootResponse(
        root=MERKLE_ROOT or "",
        updatedAt=datetime.now(timezone.utc).isoformat(),
        entryCount=len(REVOCATION_REGISTRY),
    )

# ─── Admin: Revoke credential ──────────────────────────────────────────────

@app.post("/admin/revoke")
async def revoke_credential(
    credential_id: str,
    revoked_by: str = "did:m8:ine:emisor-001",
    x_admin_token: Optional[str] = Header(None),
):
    """
    Add a credential to the revocation registry.
    Requires admin token in production.
    """
    # TODO: validate x_admin_token against config
    if x_admin_token != "dev-admin-token":
        raise HTTPException(status_code=401, detail="Invalid admin token")

    revocation_hash = _hash_credential_id(credential_id)
    REVOCATION_REGISTRY[revocation_hash] = {
        "credentialId": credential_id,
        "revokedAt": datetime.now(timezone.utc).isoformat(),
        "revokedBy": revoked_by,
    }

    _rebuild_merkle_tree()

    return {"revoked": True, "revocationHash": revocation_hash}

# ─── Metrics endpoint ────────────────────────────────────────────────────────

@app.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    """
    Get verification service metrics.
    """
    # TODO: real metrics from DB/logs
    return MetricsResponse(
        totalVerifications=0,
        successfulVerifications=0,
        failedVerifications=0,
        revokedCredentials=len(REVOCATION_REGISTRY),
        averageResponseMs=0.0,
    )

# ─── Health ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "revocationRegistrySize": len(REVOCATION_REGISTRY)}

# ─── Helpers ───────────────────────────────────────────────────────────────

def _hash_credential_id(credential_id: str) -> str:
    return hashlib.sha256(credential_id.encode()).hexdigest()

def _mock_parse_payload(encrypted_payload: str) -> Optional[dict]:
    if encrypted_payload.startswith("encrypted:"):
        return {
            "id": "cred-001",
            "issuerDid": "did:m8:ine:emisor-001",
            "issuedAt": "2026-01-15T00:00:00Z",
            "expiresAt": "2031-01-15T00:00:00Z",
            "claims": {
                "ageOver18": True,
                "citizenship": "MX",
            },
            "proof": {"type": "RsaSignature2026", "jws": "mock"},
        }
    return None

def _parse_iso(iso: str) -> datetime:
    return datetime.fromisoformat(iso.replace("Z", "+00:00"))

def _rebuild_merkle_tree():
    """Rebuild Merkle root from current revocation registry."""
    global MERKLE_ROOT
    hashes = sorted(REVOCATION_REGISTRY.keys())
    if not hashes:
        MERKLE_ROOT = None
        return

    # Simple binary tree hash
    while len(hashes) > 1:
        next_level = []
        for i in range(0, len(hashes), 2):
            left = hashes[i]
            right = hashes[i + 1] if i + 1 < len(hashes) else left
            pair = sorted([left, right])
            next_level.append(hashlib.sha256((pair[0] + pair[1]).encode()).hexdigest())
        hashes = next_level

    MERKLE_ROOT = hashes[0]

def _error_response(credential_id: str, errors: list, warnings: list, start: float):
    return VerifyResponse(
        valid=False,
        credentialId=credential_id,
        issuerDid="unknown",
        verifiedClaims={},
        errors=errors,
        warnings=warnings,
        verifiedAt=int(time.time() * 1000),
        mode="online",
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=2585)
