import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lomilomi.app",
  appName: "Lomi Lomi",
  webDir: "out",
  server: {
    url: "https://clownfish-app-32jhu.ondigitalocean.app",
    cleartext: true,
  },
};

export default config;
