import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";
import { execSync } from "child_process";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  // Step 1: Setup Python dependencies (skip on Windows)
  if (process.platform !== "win32") {
    console.log("\n========================================");
    console.log("Step 1: Setting up Python dependencies...");
    console.log("========================================\n");
    try {
      execSync("bash build.sh", { stdio: "inherit" });
    } catch (err) {
      console.error("Python setup failed:", err);
      process.exit(1);
    }
  }

  // Step 2: Build Node application
  console.log("\n========================================");
  console.log("Step 2: Building Node application...");
  console.log("========================================\n");

  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: false,
    sourcemap: true,
    external: externals,
    logLevel: "info",
  });

  console.log("\n========================================");
  console.log("Build complete!");
  console.log("========================================\n");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
