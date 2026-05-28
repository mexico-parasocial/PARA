package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// OAuthSession represents a stored OAuth session in the database
type OAuthSession struct {
	ID                      string    `gorm:"primaryKey;type:varchar(36)"`
	UserDID                 string    `gorm:"type:varchar(255);index;not null"`
	AccessTokenEncrypted    []byte    `gorm:"type:bytea;not null"`
	RefreshTokenEncrypted   []byte    `gorm:"type:bytea;not null"`
	DPoPPrivateKeyEncrypted []byte    `gorm:"type:bytea"` // Server-side DPoP key
	PDSURL                  string    `gorm:"type:varchar(255);not null"`
	Scopes                  string    `gorm:"type:text"`
	CreatedAt               time.Time `gorm:"autoCreateTime"`
	ExpiresAt               time.Time `gorm:"index;not null"`
	LastRefreshedAt         time.Time `gorm:"autoUpdateTime"`
}

// OAuthPendingState stores OAuth authorization state temporarily
type OAuthPendingState struct {
	State        string    `gorm:"primaryKey;type:varchar(64)"`
	CodeVerifier string    `gorm:"type:varchar(128);not null"`
	PDSURL       string    `gorm:"type:varchar(255);not null"`
	RedirectURI  string    `gorm:"type:varchar(512);not null"`
	Nonce        string    `gorm:"type:varchar(64)"`
	IsMobile     bool      `gorm:"default:false"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`
	ExpiresAt    time.Time `gorm:"not null"`
}

// SessionStore manages OAuth session persistence
type SessionStore struct {
	db            *gorm.DB
	encryptionKey []byte // 32 bytes for AES-256
}

// NewSessionStore creates a new session store with the given database configuration
func NewSessionStore(driver, dsn, encryptionKey string) (*SessionStore, error) {
	var dialector gorm.Dialector

	switch driver {
	case "sqlite":
		dialector = sqlite.Open(dsn)
	case "postgres":
		dialector = postgres.Open(dsn)
	default:
		return nil, fmt.Errorf("unsupported database driver: %s", driver)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Auto-migrate the schema
	if err := db.AutoMigrate(&OAuthSession{}, &OAuthPendingState{}); err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	// Parse encryption key
	keyBytes, err := parseEncryptionKey(encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("invalid encryption key: %w", err)
	}

	log.Infof("session store initialized with %s driver", driver)

	return &SessionStore{
		db:            db,
		encryptionKey: keyBytes,
	}, nil
}

// parseEncryptionKey parses a base64 or hex encoded 32-byte key
func parseEncryptionKey(key string) ([]byte, error) {
	if key == "" {
		// Generate a random key for development (NOT for production!)
		randomKey := make([]byte, 32)
		if _, err := rand.Read(randomKey); err != nil {
			return nil, err
		}
		log.Warn("generated ephemeral encryption key (development mode - not for production)")
		return randomKey, nil
	}

	// Try base64 first
	keyBytes, err := base64.StdEncoding.DecodeString(key)
	if err == nil && len(keyBytes) == 32 {
		return keyBytes, nil
	}

	// Try raw string (32 chars)
	if len(key) == 32 {
		return []byte(key), nil
	}

	return nil, errors.New("encryption key must be 32 bytes (base64 encoded or raw)")
}

// CreatePendingState stores a pending OAuth authorization state
func (s *SessionStore) CreatePendingState(state, codeVerifier, pdsURL, redirectURI, nonce string, isMobile bool) error {
	pending := OAuthPendingState{
		State:        state,
		CodeVerifier: codeVerifier,
		PDSURL:       pdsURL,
		RedirectURI:  redirectURI,
		Nonce:        nonce,
		IsMobile:     isMobile,
		ExpiresAt:    time.Now().Add(10 * time.Minute), // State valid for 10 minutes
	}

	return s.db.Create(&pending).Error
}

// GetAndDeletePendingState retrieves and deletes a pending state (consume once)
func (s *SessionStore) GetAndDeletePendingState(state string) (*OAuthPendingState, error) {
	var pending OAuthPendingState

	err := s.db.Where("state = ? AND expires_at > ?", state, time.Now()).First(&pending).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid or expired state")
		}
		return nil, err
	}

	// Delete the state (consume it)
	if err := s.db.Delete(&pending).Error; err != nil {
		return nil, err
	}

	return &pending, nil
}

// CreateSession creates a new OAuth session with encrypted tokens
func (s *SessionStore) CreateSession(userDID, accessToken, refreshToken, dpopPrivateKey, pdsURL, scopes string, expiresIn time.Duration) (*OAuthSession, error) {
	// Encrypt tokens
	accessTokenEnc, err := s.encrypt([]byte(accessToken))
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt access token: %w", err)
	}

	refreshTokenEnc, err := s.encrypt([]byte(refreshToken))
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt refresh token: %w", err)
	}

	var dpopKeyEnc []byte
	if dpopPrivateKey != "" {
		dpopKeyEnc, err = s.encrypt([]byte(dpopPrivateKey))
		if err != nil {
			return nil, fmt.Errorf("failed to encrypt DPoP key: %w", err)
		}
	}

	session := &OAuthSession{
		ID:                      uuid.New().String(),
		UserDID:                 userDID,
		AccessTokenEncrypted:    accessTokenEnc,
		RefreshTokenEncrypted:   refreshTokenEnc,
		DPoPPrivateKeyEncrypted: dpopKeyEnc,
		PDSURL:                  pdsURL,
		Scopes:                  scopes,
		ExpiresAt:               time.Now().Add(expiresIn),
	}

	if err := s.db.Create(session).Error; err != nil {
		return nil, err
	}

	return session, nil
}

// GetSession retrieves a session by ID
func (s *SessionStore) GetSession(sessionID string) (*OAuthSession, error) {
	var session OAuthSession
	err := s.db.Where("id = ? AND expires_at > ?", sessionID, time.Now()).First(&session).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("session not found or expired")
		}
		return nil, err
	}
	return &session, nil
}

// DecryptAccessToken decrypts and returns the access token for a session
func (s *SessionStore) DecryptAccessToken(session *OAuthSession) (string, error) {
	decrypted, err := s.decrypt(session.AccessTokenEncrypted)
	if err != nil {
		return "", err
	}
	return string(decrypted), nil
}

// DecryptRefreshToken decrypts and returns the refresh token for a session
func (s *SessionStore) DecryptRefreshToken(session *OAuthSession) (string, error) {
	decrypted, err := s.decrypt(session.RefreshTokenEncrypted)
	if err != nil {
		return "", err
	}
	return string(decrypted), nil
}

// DecryptDPoPPrivateKey decrypts and returns the DPoP private key for a session (PEM format)
func (s *SessionStore) DecryptDPoPPrivateKey(session *OAuthSession) (string, error) {
	if len(session.DPoPPrivateKeyEncrypted) == 0 {
		return "", nil
	}
	decrypted, err := s.decrypt(session.DPoPPrivateKeyEncrypted)
	if err != nil {
		return "", err
	}
	return string(decrypted), nil
}

// UpdateSessionTokens updates the tokens for an existing session
func (s *SessionStore) UpdateSessionTokens(sessionID, accessToken, refreshToken string, expiresIn time.Duration) error {
	accessTokenEnc, err := s.encrypt([]byte(accessToken))
	if err != nil {
		return fmt.Errorf("failed to encrypt access token: %w", err)
	}

	refreshTokenEnc, err := s.encrypt([]byte(refreshToken))
	if err != nil {
		return fmt.Errorf("failed to encrypt refresh token: %w", err)
	}

	return s.db.Model(&OAuthSession{}).Where("id = ?", sessionID).Updates(map[string]interface{}{
		"access_token_encrypted":  accessTokenEnc,
		"refresh_token_encrypted": refreshTokenEnc,
		"expires_at":              time.Now().Add(expiresIn),
		"last_refreshed_at":       time.Now(),
	}).Error
}

// DeleteSession removes a session
func (s *SessionStore) DeleteSession(sessionID string) error {
	return s.db.Delete(&OAuthSession{}, "id = ?", sessionID).Error
}

// DeleteSessionsByDID removes all sessions for a user
func (s *SessionStore) DeleteSessionsByDID(userDID string) error {
	return s.db.Delete(&OAuthSession{}, "user_did = ?", userDID).Error
}

// CleanupExpired removes expired sessions and pending states
func (s *SessionStore) CleanupExpired() error {
	now := time.Now()

	if err := s.db.Delete(&OAuthSession{}, "expires_at < ?", now).Error; err != nil {
		return err
	}

	return s.db.Delete(&OAuthPendingState{}, "expires_at < ?", now).Error
}

// StartCleanupTicker starts a background goroutine to clean up expired sessions
func (s *SessionStore) StartCleanupTicker(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			if err := s.CleanupExpired(); err != nil {
				// Use the global logger or the one configured in the app
				fmt.Printf("failed to cleanup expired sessions: %v\n", err)
			}
		}
	}()
}

// encrypt uses AES-256-GCM to encrypt data
func (s *SessionStore) encrypt(plaintext []byte) ([]byte, error) {
	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	return gcm.Seal(nonce, nonce, plaintext, nil), nil
}

// decrypt uses AES-256-GCM to decrypt data
func (s *SessionStore) decrypt(ciphertext []byte) ([]byte, error) {
	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, errors.New("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	return gcm.Open(nil, nonce, ciphertext, nil)
}
