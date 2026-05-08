// TextMe - Jitsi UI / branding overrides
// This file is automatically appended to the generated interface_config.js

// App identity
interfaceConfig.APP_NAME = 'TextMe';
interfaceConfig.NATIVE_APP_NAME = 'TextMe';
interfaceConfig.PROVIDER_NAME = 'TextMe';

// Remove all Jitsi branding
interfaceConfig.SHOW_JITSI_WATERMARK = false;
interfaceConfig.SHOW_WATERMARK_FOR_GUESTS = false;
interfaceConfig.SHOW_BRAND_WATERMARK = false;
interfaceConfig.BRAND_WATERMARK_LINK = '';
interfaceConfig.DEFAULT_LOGO_URL = '';
interfaceConfig.DEFAULT_WELCOME_PAGE_LOGO_URL = '';
interfaceConfig.SHOW_CHROME_EXTENSION_BANNER = false;
interfaceConfig.SHOW_POWERED_BY = false;
interfaceConfig.SHOW_PROMOTIONAL_CLOSE_PAGE = false;

// TextMe dark background
interfaceConfig.DEFAULT_BACKGROUND = '#0B1220';
interfaceConfig.DEFAULT_LOCAL_DISPLAY_NAME = 'Moi';
interfaceConfig.DEFAULT_REMOTE_DISPLAY_NAME = 'Contact TextMe';

// Minimal toolbar — only what's needed for a 1-on-1 call
interfaceConfig.TOOLBAR_BUTTONS = [
  'microphone',
  'camera',
  'toggle-camera',
  'hangup',
];

// No settings/productivity panels in the lightweight call surface
interfaceConfig.SETTINGS_SECTIONS = [];
interfaceConfig.SHARING_FEATURES = [];

// No welcome page room name generation
interfaceConfig.GENERATE_ROOMNAMES_ON_WELCOME_PAGE = false;
interfaceConfig.LANG_DETECTION = false;

// Hide participant count and other social features
interfaceConfig.HIDE_INVITE_MORE_HEADER = true;
interfaceConfig.DISABLE_DOMINANT_SPEAKER_INDICATOR = true;
interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS = true;
interfaceConfig.DISABLE_PRESENCE_STATUS = true;
