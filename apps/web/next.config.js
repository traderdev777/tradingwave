const path = require("path");

const isGithubActions = process.env.GITHUB_ACTIONS || false;
let basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

if (isGithubActions && process.env.GITHUB_REPOSITORY) {
  const repoName = process.env.GITHUB_REPOSITORY.replace(/.*?\//, "");
  // If repository name is not `<username>.github.io`, set basePath to `/<repo-name>`
  if (!repoName.endsWith(".github.io")) {
    basePath = `/${repoName}`;
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: {
    unoptimized: true,
  },
  experimental: {
    outputFileTracingRoot: path.join(__dirname, "../../"),
  },
};

module.exports = nextConfig;
