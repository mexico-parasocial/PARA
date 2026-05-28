import pytest
import asyncio
from datetime import datetime
from fastapi.testclient import TestClient
from src.issuer import (
    app,
    INEProxyService,
    INEProxyConfig,
    INEValidationRequest,
    INEValidationStatus,
    RevocationRequest,
)

client = TestClient(app)

# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_service():
    config = INEProxyConfig(mock_mode=True)
    return INEProxyService(config)

@pytest.fixture
def sample_images():
    """Mock image bytes"""
    return b"fake-image-data" * 1000

# ─── Unit Tests ────────────────────────────────────────────────────────────────

class TestINEValidation:
    def test_validate_ine_fields_valid(self, mock_service):
        ocr_result = {
            "nombre": "JUAN PEREZ",
            "curp": "PEGJ900101HDFRNN09",
            "clave_elector": "PEGJ900101",
            "estado": "09",
            "municipio": "014",
            "seccion": "1234",
            "vigencia": "2027",
        }
        assert mock_service._validate_ine_fields(ocr_result) is True
    
    def test_validate_ine_fields_missing_curp(self, mock_service):
        ocr_result = {
            "nombre": "JUAN PEREZ",
            "clave_elector": "PEGJ900101",
            "estado": "09",
            "vigencia": "2027",
        }
        assert mock_service._validate_ine_fields(ocr_result) is False
    
    def test_validate_ine_fields_expired(self, mock_service):
        ocr_result = {
            "curp": "PEGJ900101HDFRNN09",
            "clave_elector": "PEGJ900101",
            "estado": "09",
            "vigencia": "2020",  # Expired
        }
        assert mock_service._validate_ine_fields(ocr_result) is False
    
    def test_generate_claims(self, mock_service):
        ocr_result = {
            "curp": "PEGJ900101HDFRNN09",
            "estado": "09",
            "municipio": "014",
            "seccion": "1234",
        }
        claims = mock_service._generate_claims(ocr_result, ["age_over_18", "district"])
        
        assert claims.age_over_18 is True
        assert claims.citizenship == "MX"
        assert claims.district_hash is not None
        assert claims.curv_hash is not None
        assert len(claims.curv_hash) == 64  # SHA-256 hex
    
    @pytest.mark.asyncio
    async def test_full_validation_mock(self, mock_service):
        request = INEValidationRequest(
            session_id="test-session-123",
            device_key_fingerprint="abc123def456",
            requested_claims=["age_over_18", "citizenship"],
        )
        
        result = await mock_service.validate_ine_document(
            frontal_image=b"frontal",
            reverso_image=b"reverso",
            selfie_image=b"selfie",
            request=request,
        )
        
        assert result.status == INEValidationStatus.VALIDATED
        assert result.credential is not None
        assert result.processing_time_ms is not None
        assert result.processing_time_ms > 0
        assert result.credential.claims.age_over_18 is True
        assert result.credential.issuer_did == "did:m8:issuer:ine-proxy-1"

class TestCredentialIssuance:
    @pytest.mark.asyncio
    async def test_credential_structure(self, mock_service):
        request = INEValidationRequest(
            session_id="test-session-456",
            device_key_fingerprint="def789ghi012",
        )
        
        result = await mock_service.validate_ine_document(
            frontal_image=b"frontal",
            reverso_image=b"reverso",
            selfie_image=b"selfie",
            request=request,
        )
        
        cred = result.credential
        assert cred.version == "m8-identity-1"
        assert len(cred.credential_id) == 32  # 16 bytes hex
        assert cred.issued_at < cred.expires_at
        assert cred.proof["type"] == "RsaSignature2020"
        assert cred.proof["jws"] is not None
        assert cred.revocation_hash is not None
    
    def test_merkle_tree_building(self, mock_service):
        # Add multiple hashes
        for i in range(5):
            mock_service._add_to_merkle_tree(f"hash-{i}")
        
        root = mock_service.get_merkle_root()
        assert root is not None
        assert len(root) == 64  # SHA-256 hex
    
    def test_merkle_proof(self, mock_service):
        # Add hashes
        for i in range(10):
            mock_service._add_to_merkle_tree(f"hash-{i}")
        
        # Get proof for specific hash
        proof = mock_service.get_revocation_proof("hash-3")
        assert proof is not None
        assert len(proof) > 0

class TestRevocation:
    @pytest.mark.asyncio
    async def test_revoke_credential(self, mock_service):
        # First issue a credential
        request = INEValidationRequest(
            session_id="test-session-789",
            device_key_fingerprint="ghi345jkl678",
        )
        
        result = await mock_service.validate_ine_document(
            frontal_image=b"frontal",
            reverso_image=b"reverso",
            selfie_image=b"selfie",
            request=request,
        )
        
        cred = result.credential
        
        # Revoke it
        revoke_request = RevocationRequest(
            credential_id=cred.credential_id,
            reason="Pérdida",
            reported_by="did:m8:user:test",
        )
        
        success = mock_service.revoke_credential(revoke_request)
        assert success is True
        
        # Verify it's revoked
        is_revoked = mock_service.verify_revocation(cred.revocation_hash)
        assert is_revoked is True
    
    def test_revoke_nonexistent(self, mock_service):
        revoke_request = RevocationRequest(
            credential_id="nonexistent-id",
            reason="Pérdida",
            reported_by="did:m8:user:test",
        )
        
        success = mock_service.revoke_credential(revoke_request)
        assert success is False

# ─── API Integration Tests ───────────────────────────────────────────────────

class TestAPIEndpoints:
    def test_health_check(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "m8-ine-proxy"
    
    def test_merkle_root_empty(self):
        response = client.get("/merkle-root")
        assert response.status_code == 200
        data = response.json()
        # Initially empty
        assert "merkle_root" in data
    
    def test_revocation_check_not_revoked(self):
        response = client.get("/revocation-check/nonexistent-hash")
        assert response.status_code == 200
        data = response.json()
        assert data["revoked"] is False
    
    def test_validate_ine_missing_files(self):
        # Test without files
        response = client.post("/validate-ine")
        assert response.status_code == 422  # Validation error

# ─── Performance Tests ───────────────────────────────────────────────────────

class TestPerformance:
    @pytest.mark.asyncio
    async def test_processing_time_under_5_seconds(self, mock_service):
        request = INEValidationRequest(
            session_id="perf-test",
            device_key_fingerprint="perf123",
        )
        
        start = datetime.utcnow()
        result = await mock_service.validate_ine_document(
            frontal_image=b"frontal",
            reverso_image=b"reverso",
            selfie_image=b"selfie",
            request=request,
        )
        elapsed = (datetime.utcnow() - start).total_seconds()
        
        assert result.status == INEValidationStatus.VALIDATED
        assert elapsed < 5.0  # Should complete in under 5 seconds even with mock delays
        assert result.processing_time_ms is not None
        assert result.processing_time_ms < 5000
