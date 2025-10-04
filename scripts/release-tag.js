#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("❌ Usage: pnpm release:tag <version>");
  console.error("   Example: pnpm release:tag v1.0.0");
  process.exit(1);
}

const version = args[0];

// Validate version format
if (!version.match(/^v\d+\.\d+\.\d+$/)) {
  console.error("❌ Invalid version format. Use: vX.Y.Z (e.g., v1.0.0)");
  process.exit(1);
}

console.log(`🏷️  Creating release tag: ${version}`);

// Check for uncommitted changes
try {
  const status = execSync("git status --porcelain").toString();
  if (status) {
    console.error("❌ You have uncommitted changes. Commit or stash them first.");
    process.exit(1);
  }
} catch (error) {
  console.error("❌ Git error:", error.message);
  process.exit(1);
}

// Create and push tag
try {
  console.log("📝 Creating tag...");
  execSync(`git tag ${version}`, { stdio: "inherit" });

  console.log("⬆️  Pushing tag to remote...");
  execSync(`git push origin ${version}`, { stdio: "inherit" });

  console.log(`✅ Release tag ${version} created and pushed!`);
  console.log("🎉 GitHub Actions will now build and create the release.");
} catch (error) {
  console.error("❌ Failed to create/push tag:", error.message);
  process.exit(1);
}
