from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import hashlib
import json
import os
import asyncio
from dataclasses import dataclass

# ─── Models ────────────────────────────────────────────────────────────────────

class INEValidationStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    VALIDATED = "validated"
    REJECTED = "rejected"
    REVOKED = "revoked"

class INESide(str, Enum):
    FRONTAL = "frontal"
    REVERSO = "reverso"

class CredentialClaim(BaseModel):
    age_over_18: bool = Field(..., description="Titular es mayor de edad")
    age_over_21: Optional[bool] = Field(None, description="Titular tiene 21+ años")
    citizenship: str = Field(default="MX", description="Ciudadanía mexicana")
    district_hash: Optional[str] = Field(None, description="Hash del distrito electoral")
    curv_hash: str = Field(..., description="Hash de CURP (no CURP completa)")
    credential_type: str = Field(default="ine-credential", description="Tipo de credencial emitida")

class INECredential(BaseModel):
    version: str = "m8-identity-1"
    credential_id: str = Field(..., description="UUID v4 único de la credencial")
    issuer_did: str = Field(..., description="DID del emisor INE-proxy")
    issued_at: datetime
    expires_at: datetime
    claims: CredentialClaim
    proof: Dict[str, Any] = Field(..., description="Firma criptográfica del emisor")
    revocation_hash: str = Field(..., description="Hash para lista de revocación")

class INEValidationRequest(BaseModel):
    session_id: str = Field(..., description="ID de sesión del proof broker")
    device_key_fingerprint: str = Field(..., description="Fingerprint de la clave pública del dispositivo")
    requested_claims: List[str] = Field(default=["age_over_18", "citizenship"], description="Claims solicitados")

class INEValidationResult(BaseModel):
    status: INEValidationStatus
    credential: Optional[INECredential] = None
    rejection_reason: Optional[str] = None
    processing_time_ms: Optional[int] = None
    validation_id: str

class RevocationRequest(BaseModel):
    credential_id: str
    reason: str = Field(..., description="Pérdida, robo, o revocación administrativa")
    reported_by: str = Field(..., description="DID del reportante")
    proof_of_ownership: Optional[str] = None  # Firma con clave privada del dispositivo original

# ─── INE Proxy Service ───────────────────────────────────────────────────────

@dataclass
class INEProxyConfig:
    issuer_did: str = "did:m8:issuer:ine-proxy-1"
    credential_validity_days: int = 365
    max_retries: int = 3
    mock_mode: bool = True  # En dev, simula validación sin llamar a INE real
    
class INEProxyService:
    def __init__(self, config: INEProxyConfig = None):
        self.config = config or INEProxyConfig()
        self._credentials_db: Dict[str, INECredential] = {}
        self._revocation_list: List[str] = []  # Lista de revocation_hash
        self._validation_history: Dict[str, List[Dict]] = {}
        self._merkle_tree: List[List[str]] = [[]]  # Merkle tree de hashes
        
    async def validate_ine_document(
        self,
        frontal_image: bytes,
        reverso_image: bytes,
        selfie_image: bytes,
        request: INEValidationRequest,
    ) -> INEValidationResult:
        """
        Pipeline de validación INE:
        1. OCR de ambas caras del INE
        2. Validación de campos (CURP, nombre, dirección, foto)
        3. Liveness detection en selfie
        4. Cross-validation: foto INE vs selfie
        5. Generación de claims verificables
        6. Emisión de credencial firmada
        """
        start_time = datetime.utcnow()
        validation_id = hashlib.sha256(
            f"{request.session_id}:{start_time.isoformat()}".encode()
        ).hexdigest()[:16]
        
        try:
            # Paso 1: OCR
            ocr_result = await self._extract_ine_data(frontal_image, reverso_image)
            
            # Paso 2: Validación de campos
            if not self._validate_ine_fields(ocr_result):
                return INEValidationResult(
                    status=INEValidationStatus.REJECTED,
                    rejection_reason="Campos INE inválidos o incompletos",
                    validation_id=validation_id,
                )
            
            # Paso 3: Liveness detection
            liveness_score = await self._check_liveness(selfie_image)
            if liveness_score < 0.85:
                return INEValidationResult(
                    status=INEValidationStatus.REJECTED,
                    rejection_reason="Liveness check fallido (posible foto estática)",
                    validation_id=validation_id,
                )
            
            # Paso 4: Cross-validation facial
            match_score = await self._compare_faces(ocr_result["foto_ine"], selfie_image)
            if match_score < 0.80:
                return INEValidationResult(
                    status=INEValidationStatus.REJECTED,
                    rejection_reason="Foto INE no coincide con selfie",
                    validation_id=validation_id,
                )
            
            # Paso 5: Generar claims
            claims = self._generate_claims(ocr_result, request.requested_claims)
            
            # Paso 6: Emitir credencial
            credential = self._issue_credential(
                claims=claims,
                device_fingerprint=request.device_key_fingerprint,
                validation_id=validation_id,
            )
            
            # Registrar en merkle tree
            self._add_to_merkle_tree(credential.revocation_hash)
            
            # Guardar en DB
            self._credentials_db[credential.credential_id] = credential
            
            processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            return INEValidationResult(
                status=INEValidationStatus.VALIDATED,
                credential=credential,
                processing_time_ms=processing_time,
                validation_id=validation_id,
            )
            
        except Exception as e:
            return INEValidationResult(
                status=INEValidationStatus.REJECTED,
                rejection_reason=f"Error interno: {str(e)}",
                validation_id=validation_id,
            )
    
    async def _extract_ine_data(self, frontal: bytes, reverso: bytes) -> Dict[str, Any]:
        """OCR de INE. En mock mode, genera datos sintéticos realistas."""
        if self.config.mock_mode:
            # Simular delay de procesamiento
            await asyncio.sleep(0.5)
            return {
                "nombre": "JUAN PEREZ GARCIA",
                "curp": "PEGJ900101HDFRNN09",
                "clave_elector": "PEGJ900101",
                "año_registro": "2018",
                "estado": "09",  # CDMX
                "municipio": "014",
                "seccion": "1234",
                "emision": "2021",
                "vigencia": "2027",
                "foto_ine": b"mock_face_data",
                "ocr_confidence": 0.94,
            }
        
        # TODO: OCR local con PaddleOCR o EasyOCR
        # TODO: Face detection/comparison con OpenCV + InsightFace
        raise NotImplementedError("OCR local no implementado. Requiere PaddleOCR/EasyOCR + InsightFace")
    
    def _validate_ine_fields(self, ocr_result: Dict[str, Any]) -> bool:
        """Validar que los campos OCR tienen formato correcto."""
        required_fields = ["curp", "clave_elector", "estado", "vigencia"]
        for field in required_fields:
            if field not in ocr_result or not ocr_result[field]:
                return False
        
        # Validar CURP formato
        curp = ocr_result["curp"]
        if len(curp) != 18:
            return False
        
        # Validar vigencia no expirada
        try:
            vigencia = int(ocr_result["vigencia"])
            if vigencia < datetime.now().year:
                return False
        except ValueError:
            return False
        
        return True
    
    async def _check_liveness(self, selfie: bytes) -> float:
        """Liveness detection. En mock, retorna score alto."""
        if self.config.mock_mode:
            await asyncio.sleep(0.3)
            return 0.92
        
        # TODO: Liveness local con blink detection (InsightFace landmarks)
        # TODO: Depth estimation con stereo o focus analysis
        raise NotImplementedError("Liveness local no implementado. Requiere InsightFace landmarks + challenge-response")
    
    async def _compare_faces(self, foto_ine: bytes, selfie: bytes) -> float:
        """Comparación facial INE vs selfie."""
        if self.config.mock_mode:
            await asyncio.sleep(0.3)
            return 0.88
        
        # TODO: Face embedding local con InsightFace (ArcFace) o DeepFace
        # TODO: Similarity con cosine distance
        raise NotImplementedError("Face comparison local no implementado. Requiere InsightFace/DeepFace")
    
    def _generate_claims(
        self,
        ocr_result: Dict[str, Any],
        requested_claims: List[str],
    ) -> CredentialClaim:
        """Generar claims verificables a partir de datos INE."""
        
        # Calcular edad aproximada desde CURP
        curp = ocr_result["curp"]
        birth_year = int(curp[4:6])
        # Asumir 1900+ si > 50, 2000+ si <= 50 (heurística CURP)
        if birth_year > int(str(datetime.now().year)[2:4]):
            birth_year += 1900
        else:
            birth_year += 2000
        
        age = datetime.now().year - birth_year
        
        # Hash de distrito: estado + municipio + seccion
        district_str = f"{ocr_result['estado']}-{ocr_result['municipio']}-{ocr_result['seccion']}"
        district_hash = hashlib.sha256(district_str.encode()).hexdigest()[:16]
        
        # CURV: hash de CURP + salt único por emisión
        salt = os.urandom(16).hex()
        curv_hash = hashlib.sha256(f"{ocr_result['curp']}:{salt}".encode()).hexdigest()
        
        claims = CredentialClaim(
            age_over_18=age >= 18,
            age_over_21=age >= 21 if "age_over_21" in requested_claims else None,
            citizenship="MX",
            district_hash=district_hash if "district" in requested_claims else None,
            curv_hash=curv_hash,
        )
        
        return claims
    
    def _issue_credential(
        self,
        claims: CredentialClaim,
        device_fingerprint: str,
        validation_id: str,
    ) -> INECredential:
        """Emitir credencial firmada."""
        
        credential_id = os.urandom(16).hex()
        now = datetime.utcnow()
        expires = now + timedelta(days=self.config.credential_validity_days)
        
        # Crear hash para revocación (sin revelar credential_id)
        revocation_hash = hashlib.sha256(
            f"{credential_id}:{device_fingerprint}".encode()
        ).hexdigest()
        
        # Datos a firmar
        credential_data = {
            "version": "m8-identity-1",
            "credential_id": credential_id,
            "issuer_did": self.config.issuer_did,
            "issued_at": now.isoformat(),
            "expires_at": expires.isoformat(),
            "claims": claims.model_dump(),
            "revocation_hash": revocation_hash,
        }
        
        # Firmar (mock - en producción usar HSM)
        signature = self._sign_credential(credential_data)
        
        proof = {
            "type": "RsaSignature2020",
            "created": now.isoformat(),
            "proofPurpose": "assertionMethod",
            "verificationMethod": f"{self.config.issuer_did}#signing-key-1",
            "jws": signature,
        }
        
        return INECredential(
            version="m8-identity-1",
            credential_id=credential_id,
            issuer_did=self.config.issuer_did,
            issued_at=now,
            expires_at=expires,
            claims=claims,
            proof=proof,
            revocation_hash=revocation_hash,
        )
    
    def _sign_credential(self, data: Dict[str, Any]) -> str:
        """Firmar credencial con clave del emisor."""
        # Mock: hash de los datos + secret
        secret = os.environ.get("M8_ISSUER_SECRET", "dev-secret-do-not-use-in-production")
        payload = json.dumps(data, sort_keys=True)
        return hashlib.sha256(f"{payload}:{secret}".encode()).hexdigest()
    
    def _add_to_merkle_tree(self, revocation_hash: str):
        """Agregar hash al merkle tree."""
        # Ensure hash is proper SHA-256 length
        if len(revocation_hash) != 64:
            revocation_hash = hashlib.sha256(revocation_hash.encode()).hexdigest()
        self._merkle_tree[0].append(revocation_hash)
        # Reconstruir tree cada 100 entries
        if len(self._merkle_tree[0]) % 100 == 0:
            self._rebuild_merkle_tree()
    
    def _rebuild_merkle_tree(self):
        """Reconstruir merkle tree completo."""
        leaves = self._merkle_tree[0]
        if not leaves:
            return
        
        tree = [leaves]
        current_level = leaves
        
        while len(current_level) > 1:
            next_level = []
            for i in range(0, len(current_level), 2):
                left = current_level[i]
                right = current_level[i + 1] if i + 1 < len(current_level) else left
                combined = hashlib.sha256(f"{left}:{right}".encode()).hexdigest()
                next_level.append(combined)
            tree.append(next_level)
            current_level = next_level
        
        self._merkle_tree = tree
    
    def revoke_credential(self, request: RevocationRequest) -> bool:
        """Revocar credencial por pérdida/robo."""
        # Verificar proof_of_ownership si existe
        if request.proof_of_ownership:
            # Validar firma con clave pública del dispositivo original
            pass  # TODO: implementar verificación
        
        # Buscar credencial
        credential = self._credentials_db.get(request.credential_id)
        if not credential:
            return False
        
        # Agregar a lista de revocación
        self._revocation_list.append(credential.revocation_hash)
        
        # Actualizar merkle tree
        self._rebuild_merkle_tree()
        
        return True
    
    def verify_revocation(self, revocation_hash: str) -> bool:
        """Verificar si un hash está en la lista de revocación."""
        return revocation_hash in self._revocation_list
    
    def get_merkle_root(self) -> Optional[str]:
        """Obtener raíz del merkle tree."""
        if not self._merkle_tree or not self._merkle_tree[-1]:
            return None
        return self._merkle_tree[-1][0]
    
    def get_revocation_proof(self, revocation_hash: str) -> Optional[List[str]]:
        """Obtener merkle proof para un hash específico."""
        # Normalize hash to SHA-256 hex
        if len(revocation_hash) != 64:
            revocation_hash = hashlib.sha256(revocation_hash.encode()).hexdigest()
        
        if revocation_hash not in self._merkle_tree[0]:
            return None
        
        # Ensure tree is built
        if len(self._merkle_tree) == 1:
            self._rebuild_merkle_tree()
        
        # Construir proof path
        index = self._merkle_tree[0].index(revocation_hash)
        proof = []
        
        for level in range(len(self._merkle_tree) - 1):
            level_size = len(self._merkle_tree[level])
            sibling_index = index + 1 if index % 2 == 0 else index - 1
            
            if sibling_index < level_size:
                proof.append(self._merkle_tree[level][sibling_index])
            else:
                proof.append(self._merkle_tree[level][index])  # Duplicate last
            
            index //= 2
        
        return proof

# ─── FastAPI Application ───────────────────────────────────────────────────

app = FastAPI(
    title="m8 INE Proxy Emisor",
    description="Servicio de emisión de credenciales verificables basadas en INE",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restringir en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singleton del servicio
ine_service = INEProxyService()

@app.post("/validate-ine", response_model=INEValidationResult)
async def validate_ine(
    background_tasks: BackgroundTasks,
    frontal: UploadFile = File(..., description="Foto frontal del INE"),
    reverso: UploadFile = File(..., description="Foto reverso del INE"),
    selfie: UploadFile = File(..., description="Selfie con liveness"),
    request: INEValidationRequest = Depends(),
):
    """
    Endpoint principal de validación INE.
    
    Recibe tres imágenes:
    - frontal: Cara frontal del INE con foto y datos
    - reverso: Reverso con código de barras y dirección
    - selfie: Foto del titular para liveness y comparación
    
    Retorna credencial verificable si la validación es exitosa.
    """
    # Validar tipos de archivo
    for img in [frontal, reverso, selfie]:
        if not img.content_type or not img.content_type.startswith("image/"):
            raise HTTPException(400, f"{img.filename} no es una imagen válida")
    
    # Leer bytes
    frontal_bytes = await frontal.read()
    reverso_bytes = await reverso.read()
    selfie_bytes = await selfie.read()
    
    # Validar tamaños
    for name, data in [("frontal", frontal_bytes), ("reverso", reverso_bytes), ("selfie", selfie_bytes)]:
        if len(data) > 10 * 1024 * 1024:  # 10MB max
            raise HTTPException(400, f"{name} excede 10MB")
    
    # Procesar
    result = await ine_service.validate_ine_document(
        frontal_image=frontal_bytes,
        reverso_image=reverso_bytes,
        selfie_image=selfie_bytes,
        request=request,
    )
    
    return result

@app.post("/revoke", response_model=Dict[str, Any])
async def revoke_credential(request: RevocationRequest):
    """
    Revocar una credencial por pérdida, robo o solicitud del titular.
    """
    success = ine_service.revoke_credential(request)
    
    if not success:
        raise HTTPException(404, "Credencial no encontrada")
    
    return {
        "revoked": True,
        "credential_id": request.credential_id,
        "revocation_list_size": len(ine_service._revocation_list),
        "merkle_root": ine_service.get_merkle_root(),
    }

@app.get("/revocation-check/{revocation_hash}")
async def check_revocation(revocation_hash: str):
    """
    Verificar si un hash de credencial está revocado.
    Público: no requiere autenticación.
    """
    is_revoked = ine_service.verify_revocation(revocation_hash)
    
    return {
        "revoked": is_revoked,
        "revocation_hash": revocation_hash,
        "merkle_root": ine_service.get_merkle_root(),
        "proof": ine_service.get_revocation_proof(revocation_hash) if is_revoked else None,
    }

@app.get("/merkle-root")
async def get_merkle_root():
    """
    Obtener la raíz actual del merkle tree.
    Usado por verificadores para check de revocación offline.
    """
    return {
        "merkle_root": ine_service.get_merkle_root(),
        "total_credentials": len(ine_service._merkle_tree[0]) if ine_service._merkle_tree else 0,
        "timestamp": datetime.utcnow().isoformat(),
    }

@app.get("/health")
async def health_check():
    """Health check para load balancers."""
    return {
        "status": "healthy",
        "service": "m8-ine-proxy",
        "mock_mode": ine_service.config.mock_mode,
        "credentials_issued": len(ine_service._credentials_db),
        "revocations": len(ine_service._revocation_list),
    }

# ─── Startup ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=2585)
