// TextMe - Jitsi server-side config overrides
// This file is automatically appended to the generated config.js

const textmeToolbarButtons = [
  'microphone',
  'camera',
  'toggle-camera',
  'hangup',
];

// Skip the "ready to join?" pre-call screen entirely
config.prejoinConfig = { enabled: false };

// Audio/video are allowed immediately. Audio-call URLs explicitly mute video.
config.startAudioMuted = 10;
config.startVideoMuted = 10;
config.startWithAudioMuted = false;
config.startWithVideoMuted = false;
config.startSilent = false;
config.disableInitialGUM = false;

// Disable lobby — no moderator approval, direct join
if (!config.lobby) config.lobby = {};
config.lobby.enabled = false;
config.lobby.autoKnock = false;
config.enableLobbyChat = false;
config.hideLobbyButton = true;

// Never prompt to open the Jitsi native app
config.disableDeepLinking = true;
config.enableInsecureRoomNameWarning = false;

// Always use the TextMe bridge so audio/video works consistently on mobile networks.
config.p2p = {
  enabled: false,
};

// Minimal TextMe call UI: voice, video, switch camera, hang up.
config.toolbarButtons = textmeToolbarButtons;
config.toolbarConfig = {
  alwaysVisible: true,
  initialTimeout: 3000,
  timeout: 3000,
};

// Remove conference/productivity features that do not belong in a simple call.
config.disableInviteFunctions = true;
config.disablePolls = true;
config.disableReactions = true;
config.disableRemoteVideoMenu = true;
config.disableProfile = true;
config.disableShortcuts = true;
config.hideConferenceSubject = true;
config.disableModeratorIndicator = true;
config.disableJoinLeaveSounds = true;
config.enableNoAudioDetection = false;
config.enableNoisyMicDetection = false;
config.disableSpeakerStatsSearch = true;
config.speakerStats = { disabled: true };
config.participantsPane = { enabled: false };
config.breakoutRooms = {
  hideAddRoomButton: true,
  hideAutoAssignButton: true,
  hideJoinRoomButton: true,
};
config.whiteboard = { enabled: false };
config.remoteVideoMenu = {
  disabled: true,
  disableGrantModerator: true,
  disableKick: true,
  disablePrivateChat: true,
};

// TextMe branding, no Jitsi watermark.
config.defaultLogoUrl = '';
config.defaultWelcomePageLogoUrl = '';
config.defaultLocalDisplayName = 'Moi';
config.defaultRemoteDisplayName = 'Contact TextMe';

// Video quality - mobile-friendly by default.
config.constraints = {
  video: { height: { ideal: 360, max: 480, min: 180 } },
};

// No analytics
if (!config.analytics) config.analytics = {};
config.analytics.disabled = true;
delete config.analytics.googleAnalyticsTrackingId;
delete config.analytics.amplitudeAPPKey;
