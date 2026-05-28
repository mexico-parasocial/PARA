package main

import (
	"bytes"
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/bluesky-social/indigo/atproto/identity"
	"github.com/bluesky-social/indigo/atproto/syntax"
	"github.com/labstack/echo/v4"
	"github.com/lestrrat-go/jwx/v2/jwa"
	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jws"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

// OAuthConfig holds OAuth client configuration
type OAuthConfig struct {
	ClientID     string   // The client_id (typically the metadata URL)
	ClientName   string   // Human-readable client name
	RedirectURIs []string // Allowed redirect URIs
	Scopes       string   // OAuth scopes to request
	BaseURL      string   // Base URL of this server (e.g., https://para.social)
	CookieDomain string   // Domain for session cookies
	CookieSecure bool     // Use secure cookies (true in production)
	KeyManager   *KeyManager
	SessionStore *SessionStore
	DPoPRequired bool   // Whether DPoP is required (always true for AT Proto)
	PLCURL       string // Optional: PLC directory URL for local dev
	PDSURL       string // Optional: PDS URL for local handle resolution
}

// OAuthClientMetadata represents the OAuth client metadata document
type OAuthClientMetadata struct {
	ClientID                    string   `json:"client_id"`
	ClientName                  string   `json:"client_name"`
	RedirectURIs                []string `json:"redirect_uris"`
	ResponseTypes               []string `json:"response_types"`
	GrantTypes                  []string `json:"grant_types"`
	Scope                       string   `json:"scope"`
	TokenEndpointAuthMethod     string   `json:"token_endpoint_auth_method"`
	TokenEndpointAuthSigningAlg string   `json:"token_endpoint_auth_signing_alg"`
	JWKSURI                     string   `json:"jwks_uri"`
	DPoPBoundAccessTokens       bool     `json:"dpop_bound_access_tokens"`
}

// TokenResponse represents the OAuth token response from the PDS
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	Scope        string `json:"scope"`
	Sub          string `json:"sub"` // User DID
}

// PARResponse represents the response from the Pushed Authorization Request endpoint
type PARResponse struct {
	RequestURI string `json:"request_uri"`
	ExpiresIn  int    `json:"expires_in"`
}

// OAuthError represents a standard OAuth 2.0 error response
type OAuthError struct {
	Error       string `json:"error"`
	Description string `json:"error_description,omitempty"`
}

// OAuthHandler handles all OAuth-related endpoints
type OAuthHandler struct {
	config   *OAuthConfig
	resolver identity.Directory
}

// NewOAuthHandler creates a new OAuth handler
func NewOAuthHandler(config *OAuthConfig) *OAuthHandler {
	var resolver identity.Directory

	// Use custom directory for local development if PLC URL is provided
	if config.PLCURL != "" {
		resolver = &identity.BaseDirectory{
			PLCURL: config.PLCURL,
		}
		log.Infof("OAuth using custom PLC directory: %s", config.PLCURL)
	} else {
		resolver = identity.DefaultDirectory()
	}

	return &OAuthHandler{
		config:   config,
		resolver: resolver,
	}
}

// RegisterRoutes registers all OAuth routes with the Echo instance
func (h *OAuthHandler) RegisterRoutes(e *echo.Echo) {
	// Public discovery endpoints
	e.GET("/.well-known/jwks.json", h.handleJWKS)
	e.GET("/oauth-client-metadata.json", h.handleClientMetadata)

	// OAuth flow endpoints
	e.GET("/oauth/authorize", h.handleAuthorize)
	e.GET("/oauth/callback", h.handleCallback)
	e.POST("/oauth/token", h.handleTokenExchange)

	// Protected endpoints (require session)
	protected := e.Group("", h.SessionMiddleware)
	protected.POST("/oauth/refresh", h.handleRefresh)
	protected.POST("/oauth/logout", h.handleLogout)
	protected.GET("/api/session", h.handleSessionInfo)
}

// handleJWKS serves the public JSON Web Key Set
func (h *OAuthHandler) handleJWKS(c echo.Context) error {
	jwks, err := h.config.KeyManager.GetJWKS()
	if err != nil {
		log.Errorf("failed to get JWKS: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "internal_error",
		})
	}

	c.Response().Header().Set("Content-Type", "application/json")
	c.Response().Header().Set("Cache-Control", "public, max-age=86400")
	return c.JSONBlob(http.StatusOK, jwks)
}

// handleClientMetadata serves the OAuth client metadata document
func (h *OAuthHandler) handleClientMetadata(c echo.Context) error {
	metadata := OAuthClientMetadata{
		ClientID:                    h.config.ClientID,
		ClientName:                  h.config.ClientName,
		RedirectURIs:                h.config.RedirectURIs,
		ResponseTypes:               []string{"code"},
		GrantTypes:                  []string{"authorization_code", "refresh_token"},
		Scope:                       h.config.Scopes,
		TokenEndpointAuthMethod:     "private_key_jwt",
		TokenEndpointAuthSigningAlg: "ES256",
		JWKSURI:                     h.config.BaseURL + "/.well-known/jwks.json",
		DPoPBoundAccessTokens:       true,
	}

	c.Response().Header().Set("Content-Type", "application/json")
	c.Response().Header().Set("Cache-Control", "public, max-age=3600")
	return c.JSON(http.StatusOK, metadata)
}

// handleAuthorize initiates the OAuth authorization flow
func (h *OAuthHandler) handleAuthorize(c echo.Context) error {
	handle := c.QueryParam("handle")
	if handle == "" {
		return c.JSON(http.StatusBadRequest, OAuthError{
			Error:       "invalid_request",
			Description: "handle parameter required",
		})
	}

	// Determine redirect URI (web vs mobile)
	redirectURI := c.QueryParam("redirect_uri")
	if redirectURI == "" {
		redirectURI = h.config.BaseURL + "/oauth/callback"
	}

	// Check if this is a mobile request
	isMobile := strings.HasPrefix(redirectURI, "parasocial://")

	// Validate redirect URI
	validRedirect := false
	for _, uri := range h.config.RedirectURIs {
		if uri == redirectURI {
			validRedirect = true
			break
		}
	}
	if !validRedirect {
		return c.JSON(http.StatusBadRequest, OAuthError{
			Error:       "invalid_request",
			Description: "invalid redirect_uri",
		})
	}

	// Resolve the user's PDS URL using handle resolution
	ctx := c.Request().Context()
	ident, err := h.resolver.LookupHandle(ctx, syntax.Handle(handle))

	// Fallback: If standard resolution fails and we have a local PDS configured, try querying it directly
	// This is needed for local development with .test TLD handles
	if err != nil && h.config.PDSURL != "" {
		log.Infof("standard handle resolution failed, trying local PDS at %s", h.config.PDSURL)
		ident, err = h.resolveHandleViaPDS(ctx, handle)
	}

	if err != nil {
		log.Warnf("failed to resolve handle %s: %v", handle, err)
		return c.JSON(http.StatusBadRequest, OAuthError{
			Error:       "invalid_handle",
			Description: fmt.Sprintf("could not resolve handle: %s", handle),
		})
	}

	pdsURL := ident.PDSEndpoint()
	// For local dev, if no PDS in DID doc, use the configured local PDS
	if pdsURL == "" && h.config.PDSURL != "" {
		pdsURL = h.config.PDSURL
	}
	if pdsURL == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error":             "invalid_handle",
			"error_description": "no PDS found for this handle",
		})
	}

	log.Infof("resolved handle %s to DID %s at PDS %s", handle, ident.DID.String(), pdsURL)

	// Generate PKCE code verifier
	codeVerifier, err := generateSecureRandom(64)
	if err != nil {
		log.Errorf("failed to generate code verifier: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "internal_error",
		})
	}

	// Generate state and nonce
	state, err := generateSecureRandom(32)
	if err != nil {
		log.Errorf("failed to generate state: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "internal_error",
		})
	}

	nonce, err := generateSecureRandom(32)
	if err != nil {
		log.Errorf("failed to generate nonce: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "internal_error",
		})
	}

	// Store pending state in database
	if err := h.config.SessionStore.CreatePendingState(state, codeVerifier, pdsURL, redirectURI, nonce, isMobile); err != nil {
		log.Errorf("failed to store pending state: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "internal_error",
		})
	}

	// Push authorization request (PAR)
	requestURI, err := h.pushAuthorizationRequest(c.Request().Context(), pdsURL, redirectURI, state, codeVerifier, nonce, handle)
	if err != nil {
		log.Errorf("failed to push authorization request: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error":             "par_failed",
			"error_description": "failed to initiate secure authorization",
		})
	}

	// Build the authorization URL using request_uri
	authURL := fmt.Sprintf("%s/oauth/authorize?client_id=%s&request_uri=%s",
		pdsURL,
		url.QueryEscape(h.config.ClientID),
		url.QueryEscape(requestURI),
	)

	log.Infof("redirecting to PDS authorization endpoint: %s", pdsURL)
	return c.Redirect(http.StatusTemporaryRedirect, authURL)
}

// handleCallback handles the OAuth callback from the PDS
func (h *OAuthHandler) handleCallback(c echo.Context) error {
	code := c.QueryParam("code")
	state := c.QueryParam("state")
	errorParam := c.QueryParam("error")

	if errorParam != "" {
		errorDesc := c.QueryParam("error_description")
		log.Warnf("OAuth error from PDS: %s - %s", errorParam, errorDesc)
		return c.JSON(http.StatusBadRequest, OAuthError{
			Error:       errorParam,
			Description: errorDesc,
		})
	}

	if code == "" || state == "" {
		return c.JSON(http.StatusBadRequest, OAuthError{
			Error:       "invalid_request",
			Description: "code and state parameters required",
		})
	}

	// Retrieve and validate pending state
	pendingState, err := h.config.SessionStore.GetAndDeletePendingState(state)
	if err != nil {
		log.Warnf("invalid OAuth state: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error":             "invalid_request",
			"error_description": "invalid or expired state",
		})
	}

	// Generate DPoP key for this session
	rawKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		log.Errorf("failed to generate DPoP key: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "internal_error",
		})
	}
	dpopKey, err := jwk.FromRaw(rawKey)
	if err != nil {
		log.Errorf("failed to create JWK from DPoP key: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "internal_error",
		})
	}

	dpopPEM, err := h.exportJWKToPEM(dpopKey)
	if err != nil {
		log.Errorf("failed to export DPoP key: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "internal_error",
		})
	}

	log.Infof("exchanging authorization code for tokens at PDS: %s", pendingState.PDSURL)

	// Exchange authorization code for tokens (using DPoP)
	tokenResp, err := h.exchangeCodeForTokens(pendingState.PDSURL, code, pendingState.CodeVerifier, pendingState.RedirectURI, dpopKey)
	if err != nil {
		log.Errorf("token exchange failed: %v", err)
		return c.JSON(http.StatusInternalServerError, OAuthError{
			Error:       "token_exchange_failed",
			Description: err.Error(),
		})
	}

	log.Infof("token exchange successful for DID: %s", tokenResp.Sub)

	// Calculate session expiry (use refresh token lifetime, default 90 days)
	sessionExpiry := 90 * 24 * time.Hour

	// Create session with encrypted tokens and DPoP key
	session, err := h.config.SessionStore.CreateSession(
		tokenResp.Sub,
		tokenResp.AccessToken,
		tokenResp.RefreshToken,
		string(dpopPEM),
		pendingState.PDSURL,
		tokenResp.Scope,
		sessionExpiry,
	)
	if err != nil {
		log.Errorf("failed to create session: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "internal_error",
		})
	}

	// Handle mobile vs web differently
	if pendingState.IsMobile {
		// For mobile: redirect back with a temporary code they can exchange
		return c.Redirect(http.StatusTemporaryRedirect,
			fmt.Sprintf("%s?session_id=%s", pendingState.RedirectURI, session.ID))
	}

	// For web: set secure session cookie
	cookie := &http.Cookie{
		Name:     "para_session",
		Value:    session.ID,
		Path:     "/",
		Domain:   h.config.CookieDomain,
		Secure:   h.config.CookieSecure,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(sessionExpiry.Seconds()),
	}
	c.SetCookie(cookie)

	// Redirect to app home
	return c.Redirect(http.StatusTemporaryRedirect, "/")
}

// exchangeCodeForTokens exchanges an authorization code for tokens at the PDS
func (h *OAuthHandler) exchangeCodeForTokens(pdsURL, code, codeVerifier, redirectURI string, dpopKey jwk.Key) (*TokenResponse, error) {
	tokenURL := pdsURL + "/oauth/token"

	// Create client_assertion JWT
	clientAssertion, err := h.createClientAssertion(tokenURL)
	if err != nil {
		return nil, fmt.Errorf("failed to create client assertion: %w", err)
	}

	// Build token request body
	data := url.Values{
		"grant_type":            {"authorization_code"},
		"code":                  {code},
		"redirect_uri":          {redirectURI},
		"code_verifier":         {codeVerifier},
		"client_id":             {h.config.ClientID},
		"client_assertion_type": {"urn:ietf:params:oauth:client-assertion-type:jwt-bearer"},
		"client_assertion":      {clientAssertion},
	}

	// Use retry helper
	resp, err := h.doRequestWithDPoPRetry(context.Background(), "POST", tokenURL, []byte(data.Encode()), "application/x-www-form-urlencoded", dpopKey, "")
	if err != nil {
		return nil, fmt.Errorf("token request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read token response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("token endpoint returned %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp TokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("failed to parse token response: %w", err)
	}

	return &tokenResp, nil
}

// handleTokenExchange handles mobile token exchange
func (h *OAuthHandler) handleTokenExchange(c echo.Context) error {
	sessionID := c.FormValue("session_id")
	if sessionID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error":             "invalid_request",
			"error_description": "session_id required",
		})
	}

	session, err := h.config.SessionStore.GetSession(sessionID)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error":             "invalid_session",
			"error_description": "session not found or expired",
		})
	}

	// Return session info (NOT the actual AT Proto tokens - those stay server-side)
	return c.JSON(http.StatusOK, map[string]interface{}{
		"session_id": session.ID,
		"did":        session.UserDID,
		"expires_at": session.ExpiresAt,
	})
}

// handleRefresh handles session refresh
func (h *OAuthHandler) handleRefresh(c echo.Context) error {
	sessionID := h.getSessionID(c)
	if sessionID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "unauthorized",
		})
	}

	session, err := h.config.SessionStore.GetSession(sessionID)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "session_expired",
		})
	}

	// Decrypt refresh token
	refreshToken, err := h.config.SessionStore.DecryptRefreshToken(session)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "internal_error",
		})
	}

	// Decrypt DPoP key
	dpopPEM, err := h.config.SessionStore.DecryptDPoPPrivateKey(session)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "internal_error",
		})
	}

	var dpopKey jwk.Key
	if dpopPEM != "" {
		dpopKey, err = jwk.ParseKey([]byte(dpopPEM), jwk.WithPEM(true))
		if err != nil {
			log.Errorf("failed to parse DPoP key from session: %v", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "internal_error",
			})
		}
	}

	// Exchange refresh token for new tokens
	tokenResp, err := h.refreshTokens(session.PDSURL, refreshToken, dpopKey)
	if err != nil {
		log.Errorf("token refresh failed: %v", err)
		// Delete invalid session
		_ = h.config.SessionStore.DeleteSession(sessionID)
		return c.JSON(http.StatusUnauthorized, OAuthError{
			Error:       "refresh_failed",
			Description: "please re-authenticate",
		})
	}

	// Update session with new tokens
	if err := h.config.SessionStore.UpdateSessionTokens(
		sessionID,
		tokenResp.AccessToken,
		tokenResp.RefreshToken,
		90*24*time.Hour,
	); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "internal_error",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"status": "refreshed",
	})
}

// refreshTokens exchanges a refresh token for new tokens
func (h *OAuthHandler) refreshTokens(pdsURL, refreshToken string, dpopKey jwk.Key) (*TokenResponse, error) {
	tokenURL := pdsURL + "/oauth/token"

	clientAssertion, err := h.createClientAssertion(tokenURL)
	if err != nil {
		return nil, err
	}

	data := url.Values{
		"grant_type":            {"refresh_token"},
		"refresh_token":         {refreshToken},
		"client_id":             {h.config.ClientID},
		"client_assertion_type": {"urn:ietf:params:oauth:client-assertion-type:jwt-bearer"},
		"client_assertion":      {clientAssertion},
	}

	// Use retry helper
	resp, err := h.doRequestWithDPoPRetry(context.Background(), "POST", tokenURL, []byte(data.Encode()), "application/x-www-form-urlencoded", dpopKey, "")
	if err != nil {
		return nil, fmt.Errorf("refresh request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("refresh failed: %s", string(body))
	}

	var tokenResp TokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

// handleLogout handles session logout
func (h *OAuthHandler) handleLogout(c echo.Context) error {
	sessionID := h.getSessionID(c)
	if sessionID != "" {
		_ = h.config.SessionStore.DeleteSession(sessionID)
	}

	// Clear cookie
	cookie := &http.Cookie{
		Name:     "para_session",
		Value:    "",
		Path:     "/",
		Domain:   h.config.CookieDomain,
		Secure:   h.config.CookieSecure,
		HttpOnly: true,
		MaxAge:   -1,
	}
	c.SetCookie(cookie)

	return c.JSON(http.StatusOK, map[string]string{
		"status": "logged_out",
	})
}

// handleSessionInfo returns current session information
func (h *OAuthHandler) handleSessionInfo(c echo.Context) error {
	sessionID := h.getSessionID(c)
	if sessionID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "not_authenticated",
		})
	}

	session, err := h.config.SessionStore.GetSession(sessionID)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "session_expired",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"did":        session.UserDID,
		"pds":        session.PDSURL,
		"expires_at": session.ExpiresAt,
	})
}

// getSessionID retrieves the session ID from cookie or header
func (h *OAuthHandler) getSessionID(c echo.Context) string {
	// Try cookie first (web)
	if cookie, err := c.Cookie("para_session"); err == nil {
		return cookie.Value
	}

	// Try Authorization header (mobile)
	auth := c.Request().Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}

	return ""
}

// createClientAssertion creates a client_assertion JWT for token endpoint authentication
func (h *OAuthHandler) createClientAssertion(audience string) (string, error) {
	now := time.Now()

	jti, err := generateSecureRandom(16)
	if err != nil {
		return "", err
	}

	token := jwt.New()
	_ = token.Set(jwt.IssuerKey, h.config.ClientID)
	_ = token.Set(jwt.SubjectKey, h.config.ClientID)
	_ = token.Set(jwt.AudienceKey, audience)
	_ = token.Set(jwt.IssuedAtKey, now)
	_ = token.Set(jwt.ExpirationKey, now.Add(5*time.Minute))
	_ = token.Set(jwt.JwtIDKey, jti)

	signed, err := jwt.Sign(token, jwt.WithKey(jwa.ES256, h.config.KeyManager.GetPrivateKey()))
	if err != nil {
		return "", err
	}

	return string(signed), nil
}

// pushAuthorizationRequest performs a Pushed Authorization Request (PAR)
func (h *OAuthHandler) pushAuthorizationRequest(ctx context.Context, pdsURL, redirectURI, state, codeVerifier, nonce, loginHint string) (string, error) {
	parURL := pdsURL + "/oauth/par"

	// Create client_assertion JWT
	clientAssertion, err := h.createClientAssertion(parURL)
	if err != nil {
		return "", fmt.Errorf("failed to create client assertion: %w", err)
	}

	// Compute S256 code challenge
	hash := sha256.Sum256([]byte(codeVerifier))
	codeChallenge := base64.RawURLEncoding.EncodeToString(hash[:])

	params := url.Values{
		"response_type":         {"code"},
		"client_id":             {h.config.ClientID},
		"redirect_uri":          {redirectURI},
		"state":                 {state},
		"code_challenge":        {codeChallenge},
		"code_challenge_method": {"S256"},
		"scope":                 {h.config.Scopes},
		"login_hint":            {loginHint},
		"client_assertion_type": {"urn:ietf:params:oauth:client-assertion-type:jwt-bearer"},
		"client_assertion":      {clientAssertion},
	}

	if nonce != "" {
		params.Set("nonce", nonce)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", parURL, strings.NewReader(params.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("PAR request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return "", fmt.Errorf("PAR endpoint returned %d: %s", resp.StatusCode, string(body))
	}

	var parResp PARResponse
	if err := json.Unmarshal(body, &parResp); err != nil {
		return "", fmt.Errorf("failed to parse PAR response: %w", err)
	}

	return parResp.RequestURI, nil
}

// Helper functions

func generateSecureRandom(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(bytes), nil
}

// resolveHandleViaPDS queries a PDS directly to resolve a handle
// This is used for local development where DNS-based handle resolution won't work
func (h *OAuthHandler) resolveHandleViaPDS(ctx context.Context, handle string) (*identity.Identity, error) {
	resolveURL := h.config.PDSURL + "/xrpc/com.atproto.identity.resolveHandle?handle=" + url.QueryEscape(handle)

	req, err := http.NewRequestWithContext(ctx, "GET", resolveURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("PDS returned %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		DID string `json:"did"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	if result.DID == "" {
		return nil, fmt.Errorf("no DID returned for handle: %s", handle)
	}

	// Create identity with the resolved DID
	did, err := syntax.ParseDID(result.DID)
	if err != nil {
		return nil, fmt.Errorf("invalid DID: %w", err)
	}

	// For local dev, we return a minimal identity with just the DID
	// The PDS URL will be filled in from config
	ident := &identity.Identity{
		DID:    did,
		Handle: syntax.Handle(handle),
	}

	return ident, nil
}

// SessionMiddleware ensures the request has a valid OAuth session
func (h *OAuthHandler) SessionMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		sessionID := h.getSessionID(c)
		if sessionID == "" {
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "authentication_required",
			})
		}

		session, err := h.config.SessionStore.GetSession(sessionID)
		if err != nil {
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "session_expired",
			})
		}

		// Store session in context for other handlers
		c.Set("oauth_session", session)
		return next(c)
	}
}

// doRequestWithDPoPRetry performs a request with DPoP handling, including nonce retries
func (h *OAuthHandler) doRequestWithDPoPRetry(ctx context.Context, method, url string, body []byte, contentType string, dpopKey jwk.Key, accessToken string) (*http.Response, error) {
	// First attempt (no nonce)
	req, err := h.createDPoPRequest(ctx, method, url, body, contentType, "", dpopKey, accessToken)
	if err != nil {
		return nil, err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}

	// Check if this is a DPoP nonce error
	if resp.StatusCode == http.StatusUnauthorized {
		nonce := resp.Header.Get("DPoP-Nonce")
		if nonce != "" {
			resp.Body.Close()
			log.Infof("received DPoP nonce request, retrying with nonce: %s", nonce)

			// Retry with nonce
			req, err := h.createDPoPRequest(ctx, method, url, body, contentType, nonce, dpopKey, accessToken)
			if err != nil {
				return nil, err
			}
			return http.DefaultClient.Do(req)
		}
	}

	return resp, nil
}

// createDPoPRequest helper to build the request with headers
func (h *OAuthHandler) createDPoPRequest(ctx context.Context, method, url string, body []byte, contentType, nonce string, dpopKey jwk.Key, accessToken string) (*http.Request, error) {
	var bodyReader io.Reader
	if body != nil {
		bodyReader = bytes.NewReader(body)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return nil, err
	}

	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}

	var dpopProof string
	if accessToken != "" {
		dpopProof, err = h.createDPoPProofWithToken(method, url, nonce, accessToken, dpopKey)
	} else {
		// Token exchange style (no access token yet)
		dpopProof, err = h.createDPoPProof(method, url, nonce, dpopKey)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to create DPoP proof: %w", err)
	}

	req.Header.Set("DPoP", dpopProof)
	return req, nil
}

// createDPoPProof creates a DPoP proof JWT for the given method and URI
func (h *OAuthHandler) createDPoPProof(method, uri, nonce string, privateKey jwk.Key) (string, error) {
	now := time.Now()

	jti, err := generateSecureRandom(16)
	if err != nil {
		return "", err
	}

	token := jwt.New()
	_ = token.Set(jwt.JwtIDKey, jti)
	_ = token.Set("htm", method)
	_ = token.Set("htu", uri)
	_ = token.Set(jwt.IssuedAtKey, now)

	if nonce != "" {
		_ = token.Set("nonce", nonce)
	}

	// DPoP requires the public key in the 'jwk' header of the JWT
	publicKey, err := privateKey.PublicKey()
	if err != nil {
		return "", err
	}

	headers := jws.NewHeaders()
	_ = headers.Set("jwk", publicKey)

	payload, err := json.Marshal(token)
	if err != nil {
		return "", err
	}

	signed, err := jws.Sign(payload, jws.WithKey(jwa.ES256, privateKey, jws.WithProtectedHeaders(headers)))
	if err != nil {
		return "", err
	}

	return string(signed), nil
}

// createDPoPProofWithToken creates a DPoP proof JWT that includes the access token hash (ath)
func (h *OAuthHandler) createDPoPProofWithToken(method, uri, nonce, accessToken string, privateKey jwk.Key) (string, error) {
	now := time.Now()

	jti, err := generateSecureRandom(16)
	if err != nil {
		return "", err
	}

	token := jwt.New()
	_ = token.Set(jwt.JwtIDKey, jti)
	_ = token.Set("htm", method)
	_ = token.Set("htu", uri)
	_ = token.Set(jwt.IssuedAtKey, now)

	if nonce != "" {
		_ = token.Set("nonce", nonce)
	}

	// Add access token hash (ath)
	hash := sha256.Sum256([]byte(accessToken))
	ath := base64.RawURLEncoding.EncodeToString(hash[:])
	_ = token.Set("ath", ath)

	// DPoP requires the public key in the 'jwk' header of the JWT
	publicKey, err := privateKey.PublicKey()
	if err != nil {
		return "", err
	}

	headers := jws.NewHeaders()
	_ = headers.Set("jwk", publicKey)

	payload, err := json.Marshal(token)
	if err != nil {
		return "", err
	}

	signed, err := jws.Sign(payload, jws.WithKey(jwa.ES256, privateKey, jws.WithProtectedHeaders(headers)))
	if err != nil {
		return "", err
	}

	return string(signed), nil
}

// exportJWKToPEM exports a JWK to PEM format (for storage)
func (h *OAuthHandler) exportJWKToPEM(key jwk.Key) ([]byte, error) {
	var rawKey interface{}
	if err := key.Raw(&rawKey); err != nil {
		return nil, err
	}
	return exportPrivateKeyPEM(rawKey)
}
