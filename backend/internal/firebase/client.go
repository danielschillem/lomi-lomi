package firebase

import (
	"context"
	"fmt"
	"log"
	"os"

	fb "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

var Messaging *messaging.Client

// Init initializes the Firebase Admin SDK.
// Reads credentials from FIREBASE_CREDENTIALS_FILE (path) or FIREBASE_CREDENTIALS_JSON (raw JSON).
// Returns nil if neither env var is set — push will fall back to Expo Push Service.
func Init() error {
	ctx := context.Background()

	credFile := os.Getenv("FIREBASE_CREDENTIALS_FILE")
	credJSON := os.Getenv("FIREBASE_CREDENTIALS_JSON")

	var opt option.ClientOption
	switch {
	case credFile != "":
		opt = option.WithCredentialsFile(credFile)
	case credJSON != "":
		opt = option.WithCredentialsJSON([]byte(credJSON))
	default:
		log.Println("[Firebase] No credentials configured — FCM disabled, using Expo fallback")
		return nil
	}

	app, err := fb.NewApp(ctx, nil, opt)
	if err != nil {
		return fmt.Errorf("firebase: init app: %w", err)
	}

	Messaging, err = app.Messaging(ctx)
	if err != nil {
		return fmt.Errorf("firebase: messaging client: %w", err)
	}

	log.Println("[Firebase] FCM initialized")
	return nil
}

// Enabled reports whether FCM is ready to send.
func Enabled() bool { return Messaging != nil }
