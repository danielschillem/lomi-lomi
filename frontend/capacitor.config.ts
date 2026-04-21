import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lomilomi.app",
  appName: "Lomi Lomi",
  webDir: "out",
  server: {
    url: "https://lomilomi.netlify.app",
    cleartext: true,
  },
};

export default config;
