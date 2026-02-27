import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";

const runCommand = (command, args, allowFailure = false) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true
  });

  if (!allowFailure && result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
};

const run = async () => {
  if (!existsSync(".env") && existsSync(".env.example")) {
    copyFileSync(".env.example", ".env");
    console.log("[compose-smoke] .env created from .env.example");
  }

  try {
    runCommand("docker", ["compose", "up", "-d", "--build", "mongo", "redis", "backend"]);
    runCommand("node", ["scripts/smoke-auth-snapshots.mjs"]);
  } finally {
    runCommand("docker", ["compose", "down"], true);
  }
};

run().catch((error) => {
  console.error("[compose-smoke] FAILED");
  console.error(error);
  process.exit(1);
});
