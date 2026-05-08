// TextMe — Jitsi server-side config overrides
// This file is automatically appended to the generated config.js

// Skip the "ready to join?" pre-call screen entirely
config.prejoinConfig = { enabled: false };

// Audio on, video muted by default (audio call default — video call URL overrides this)
config.startWithAudioMuted = false;
config.startWithVideoMuted = true;

// Disable lobby — no moderator approval, direct join
if (!config.lobby) config.lobby = {};
config.lobby.enabled = false;
config.lobby.autoKnock = false;
config.enableLobbyChat = false;
config.hideLobbyButton = true;

// Never prompt to open the Jitsi native app
config.disableDeepLinking = true;
config.enableInsecureRoomNameWarning = false;

// P2P for 1-on-1 calls: direct peer connection, no video bridge, lowest latency
config.p2p = {
  enabled: true,
  stunServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// Video quality — 480p default, good balance for mobile
config.constraints = {
  video: { height: { ideal: 480, max: 720, min: 180 } },
};

// No analytics
if (!config.analytics) config.analytics = {};
config.analytics.disabled = true;
delete config.analytics.googleAnalyticsTrackingId;
delete config.analytics.amplitudeAPPKey;
