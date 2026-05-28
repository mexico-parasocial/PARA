package main

import (
	"os"

	_ "github.com/joho/godotenv/autoload"

	logging "github.com/ipfs/go-log"
	"github.com/urfave/cli/v2"
)

var log = logging.Logger("bskyweb")

func init() {
	logging.SetAllLoggers(logging.LevelDebug)
	//logging.SetAllLoggers(logging.LevelWarn)
}

func main() {
	run(os.Args)
}

func run(args []string) {

	app := cli.App{
		Name:  "bskyweb",
		Usage: "web server for bsky.app web app (SPA)",
	}

	app.Commands = []*cli.Command{
		&cli.Command{
			Name:   "serve",
			Usage:  "run the server",
			Action: serve,
			Flags: []cli.Flag{
				&cli.StringFlag{
					Name:  "appview-host",
					Usage: "scheme, hostname, and port of PDS instance",
					Value: "http://localhost:2584",
					// retain old PDS env var for easy transition
					EnvVars: []string{"ATP_APPVIEW_HOST", "ATP_PDS_HOST"},
				},
				&cli.StringFlag{
					Name:     "ogcard-host",
					Usage:    "scheme, hostname, and port of ogcard service",
					Required: false,
					EnvVars:  []string{"OGCARD_HOST"},
				},
				&cli.StringFlag{
					Name:     "http-address",
					Usage:    "Specify the local IP/port to bind to",
					Required: false,
					Value:    ":8100",
					EnvVars:  []string{"HTTP_ADDRESS"},
				},
				&cli.StringFlag{
					Name:     "link-host",
					Usage:    "scheme, hostname, and port of link service",
					Required: false,
					Value:    "",
					EnvVars:  []string{"LINK_HOST"},
				},
				&cli.StringFlag{
					Name:    "ipcc-host",
					Usage:   "scheme, hostname, and port of ipcc service",
					Value:   "https://localhost:8730",
					EnvVars: []string{"IPCC_HOST"},
				},
				&cli.BoolFlag{
					Name:     "debug",
					Usage:    "Enable debug mode",
					Value:    false,
					Required: false,
					EnvVars:  []string{"DEBUG"},
				},
				&cli.StringFlag{
					Name:     "basic-auth-password",
					Usage:    "optional password to restrict access to web interface",
					Required: false,
					Value:    "",
					EnvVars:  []string{"BASIC_AUTH_PASSWORD"},
				},
				&cli.StringSliceFlag{
					Name:     "cors-allowed-origins",
					Usage:    "list of allowed origins for CORS requests",
					Required: false,
					Value:    cli.NewStringSlice("https://bsky.app", "https://main.bsky.dev", "https://app.staging.bsky.dev"),
					EnvVars:  []string{"CORS_ALLOWED_ORIGINS"},
				},
				&cli.StringFlag{
					Name:     "static-cdn-host",
					Usage:    "scheme, hostname, and port of static content CDN, don't end with a slash",
					Required: false,
					Value:    "",
					EnvVars:  []string{"STATIC_CDN_HOST"},
				},
				&cli.BoolFlag{
					Name:     "bsky-canonical-instance",
					Usage:    "Enable if this is the canonical deployment (bsky.app)",
					Value:    false,
					Required: false,
					EnvVars:  []string{"BSKY_CANONICAL_INSTANCE"},
				},
				&cli.BoolFlag{
					Name:     "robots-disallow-all",
					Usage:    "Crawling is allowed by default. Enable this flag to Disallow all",
					Value:    false,
					Required: false,
					EnvVars:  []string{"ROBOTS_DISALLOW_ALL"},
				},
				// OAuth Confidential Client flags
				&cli.BoolFlag{
					Name:    "oauth-enabled",
					Usage:   "Enable OAuth confidential client functionality",
					Value:   false,
					EnvVars: []string{"OAUTH_ENABLED"},
				},
				&cli.StringFlag{
					Name:    "oauth-client-id",
					Usage:   "OAuth client ID (typically the metadata URL)",
					Value:   "",
					EnvVars: []string{"OAUTH_CLIENT_ID"},
				},
				&cli.StringFlag{
					Name:    "oauth-client-name",
					Usage:   "OAuth client display name",
					Value:   "Para Social",
					EnvVars: []string{"OAUTH_CLIENT_NAME"},
				},
				&cli.StringFlag{
					Name:    "oauth-base-url",
					Usage:   "Base URL of this server (e.g., https://para.social)",
					Value:   "",
					EnvVars: []string{"OAUTH_BASE_URL"},
				},
				&cli.StringSliceFlag{
					Name:    "oauth-redirect-uris",
					Usage:   "Allowed OAuth redirect URIs",
					Value:   cli.NewStringSlice(),
					EnvVars: []string{"OAUTH_REDIRECT_URIS"},
				},
				&cli.StringFlag{
					Name:    "oauth-scopes",
					Usage:   "OAuth scopes to request",
					Value:   "atproto",
					EnvVars: []string{"OAUTH_SCOPES"},
				},
				&cli.StringFlag{
					Name:    "oauth-private-key-path",
					Usage:   "Path to ES256 private key PEM file",
					Value:   "",
					EnvVars: []string{"OAUTH_PRIVATE_KEY_PATH"},
				},
				&cli.StringFlag{
					Name:    "oauth-private-key-pem",
					Usage:   "ES256 private key PEM contents (for Docker secrets)",
					Value:   "",
					EnvVars: []string{"OAUTH_PRIVATE_KEY_PEM"},
				},
				&cli.StringFlag{
					Name:    "oauth-cookie-domain",
					Usage:   "Domain for OAuth session cookies",
					Value:   "",
					EnvVars: []string{"OAUTH_COOKIE_DOMAIN"},
				},
				&cli.BoolFlag{
					Name:    "oauth-cookie-secure",
					Usage:   "Use secure cookies (set to true in production)",
					Value:   true,
					EnvVars: []string{"OAUTH_COOKIE_SECURE"},
				},
				&cli.StringFlag{
					Name:    "oauth-db-driver",
					Usage:   "Database driver for OAuth sessions (sqlite or postgres)",
					Value:   "sqlite",
					EnvVars: []string{"OAUTH_DB_DRIVER"},
				},
				&cli.StringFlag{
					Name:    "oauth-db-dsn",
					Usage:   "Database DSN for OAuth sessions",
					Value:   "oauth_sessions.db",
					EnvVars: []string{"OAUTH_DB_DSN"},
				},
				&cli.StringFlag{
					Name:    "oauth-encryption-key",
					Usage:   "32-byte base64 key for encrypting tokens at rest",
					Value:   "",
					EnvVars: []string{"OAUTH_ENCRYPTION_KEY"},
				},
				&cli.StringFlag{
					Name:    "oauth-plc-url",
					Usage:   "PLC directory URL for local dev (e.g., http://localhost:2582)",
					Value:   "",
					EnvVars: []string{"OAUTH_PLC_URL"},
				},
				&cli.StringFlag{
					Name:    "oauth-pds-url",
					Usage:   "PDS URL for local dev handle resolution (e.g., http://localhost:2583)",
					Value:   "",
					EnvVars: []string{"OAUTH_PDS_URL"},
				},
			},
		},
	}
	app.RunAndExitOnError()
}
