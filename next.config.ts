import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Parent folder may have its own lockfile; pin Turbopack to this app.
  turbopack: {
    root: projectRoot,
  },
  experimental: {
    // Server Actions default to 1 MB. Student photos go up to 5 MB, classroom
    // photos up to 10 MB, and we also receive short audio recordings. 15 MB
    // is comfortably above the largest single upload we accept.
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
