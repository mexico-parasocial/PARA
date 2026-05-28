package main

import (
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"os"
	"sync"

	"github.com/lestrrat-go/jwx/v2/jwa"
	"github.com/lestrrat-go/jwx/v2/jwk"
)

// KeyManager handles ES256 key generation and storage for OAuth client authentication
type KeyManager struct {
	privateKey *ecdsa.PrivateKey
	publicJWKS jwk.Set
	keyID      string
	mu         sync.RWMutex
}

// NewKeyManager creates a new KeyManager, loading or generating ES256 keys
func NewKeyManager(privateKeyPath, privateKeyPEM string) (*KeyManager, error) {
	km := &KeyManager{}

	var privateKey *ecdsa.PrivateKey
	var err error

	// Try loading from PEM string first (for Docker secrets/env vars)
	if privateKeyPEM != "" {
		privateKey, err = parsePrivateKeyPEM([]byte(privateKeyPEM))
		if err != nil {
			return nil, fmt.Errorf("failed to parse private key PEM: %w", err)
		}
		log.Info("loaded ES256 private key from environment")
	} else if privateKeyPath != "" {
		// Load from file
		pemData, err := os.ReadFile(privateKeyPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read private key file: %w", err)
		}
		privateKey, err = parsePrivateKeyPEM(pemData)
		if err != nil {
			return nil, fmt.Errorf("failed to parse private key file: %w", err)
		}
		log.Infof("loaded ES256 private key from %s", privateKeyPath)
	} else {
		// Generate new key pair (development only)
		privateKey, err = ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
		if err != nil {
			return nil, fmt.Errorf("failed to generate ES256 key: %w", err)
		}
		log.Warn("generated ephemeral ES256 key pair (development mode - not for production)")
	}

	km.privateKey = privateKey

	// Create JWK from public key
	publicKey, err := jwk.FromRaw(&privateKey.PublicKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create JWK from public key: %w", err)
	}

	// Generate a stable key ID based on the public key thumbprint
	thumbprint, err := publicKey.Thumbprint(crypto.SHA256)
	if err != nil {
		return nil, fmt.Errorf("failed to compute key thumbprint: %w", err)
	}
	km.keyID = fmt.Sprintf("%x", thumbprint[:8])

	// Set required JWK fields
	if err := publicKey.Set(jwk.KeyIDKey, km.keyID); err != nil {
		return nil, fmt.Errorf("failed to set key ID: %w", err)
	}
	if err := publicKey.Set(jwk.AlgorithmKey, jwa.ES256); err != nil {
		return nil, fmt.Errorf("failed to set algorithm: %w", err)
	}
	if err := publicKey.Set(jwk.KeyUsageKey, jwk.ForSignature); err != nil {
		return nil, fmt.Errorf("failed to set key usage: %w", err)
	}

	// Create JWKS
	km.publicJWKS = jwk.NewSet()
	if err := km.publicJWKS.AddKey(publicKey); err != nil {
		return nil, fmt.Errorf("failed to add key to JWKS: %w", err)
	}

	log.Infof("OAuth key manager initialized with key ID: %s", km.keyID)

	return km, nil
}

// GetJWKS returns the public JWKS as JSON bytes
func (km *KeyManager) GetJWKS() ([]byte, error) {
	km.mu.RLock()
	defer km.mu.RUnlock()
	return json.Marshal(km.publicJWKS)
}

// GetPrivateKey returns the private key for signing JWTs
func (km *KeyManager) GetPrivateKey() *ecdsa.PrivateKey {
	km.mu.RLock()
	defer km.mu.RUnlock()
	return km.privateKey
}

// GetKeyID returns the key ID used in JWT headers
func (km *KeyManager) GetKeyID() string {
	km.mu.RLock()
	defer km.mu.RUnlock()
	return km.keyID
}

// parsePrivateKeyPEM parses a PEM-encoded EC private key
func parsePrivateKeyPEM(pemData []byte) (*ecdsa.PrivateKey, error) {
	block, _ := pem.Decode(pemData)
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM block")
	}

	// Try PKCS8 first (more modern format)
	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err == nil {
		ecKey, ok := key.(*ecdsa.PrivateKey)
		if !ok {
			return nil, fmt.Errorf("PKCS8 key is not an EC key")
		}
		return ecKey, nil
	}

	// Fall back to SEC1 format (older EC key format)
	ecKey, err := x509.ParseECPrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse EC private key: %w", err)
	}

	return ecKey, nil
}

// GenerateAndSaveKeyPair generates a new ES256 key pair and saves to file
// This is a utility function for initial key generation
func GenerateAndSaveKeyPair(path string) error {
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return fmt.Errorf("failed to generate key: %w", err)
	}

	// Encode as PKCS8
	der, err := x509.MarshalPKCS8PrivateKey(privateKey)
	if err != nil {
		return fmt.Errorf("failed to marshal private key: %w", err)
	}

	pemBlock := &pem.Block{
		Type:  "PRIVATE KEY",
		Bytes: der,
	}

	file, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return fmt.Errorf("failed to create key file: %w", err)
	}
	defer file.Close()

	if err := pem.Encode(file, pemBlock); err != nil {
		return fmt.Errorf("failed to write key file: %w", err)
	}

	log.Infof("generated ES256 key pair and saved to %s", path)
	return nil
}

// exportPrivateKeyPEM encodes a private key as PEM
func exportPrivateKeyPEM(key interface{}) ([]byte, error) {
	der, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		return nil, err
	}
	pemBlock := &pem.Block{
		Type:  "PRIVATE KEY",
		Bytes: der,
	}
	return pem.EncodeToMemory(pemBlock), nil
}
