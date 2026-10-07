import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	turbopack: {
		root: process.cwd(),
	},
	// Allow the sandbox/preview proxy hosts to load dev resources (HMR, RSC payloads).
	// Without this, Next.js blocks cross-origin `/_next/*` requests in development and
	// the preview page renders without its client-side JavaScript.
	allowedDevOrigins: ["*.e2b.app", "*.arena.ai", "*.vercel.app", "localhost", "127.0.0.1"],
};

export default nextConfig;
