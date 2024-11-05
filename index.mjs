// Efforts were to statically build the docs and host them manually. Unfortunately impossible.
// Seems all I can do is just host the dev server in production if I really want to.

// https://www.npmjs.com/package/@mintlify/previewing
// https://www.npmjs.com/package/@mintlify/prebuild

import Ora from "ora";
import fse, { pathExists } from "fs-extra";
import { pipeline } from "node:stream/promises";
import got from "got";
import path from "node:path";
import { execSync } from "node:child_process";
import * as tar from "tar";
import {
  CLIENT_PATH,
  CMD_EXEC_PATH,
  DOT_MINTLIFY,
  MINT_PATH,
  NEXT_SIDE_EFFECT_PATH,
  NEXT_PROPS_PATH,
  NEXT_PUBLIC_PATH,
  TARGET_MINT_VERSION,
  TAR_PATH,
  TAR_URL,
  VERSION_PATH,
} from "@mintlify/previewing/dist/constants.js";
import { prebuild } from "@mintlify/prebuild";

function buildLogger(startText = "") {
  return Ora().start(startText);
}

/**
 * @param {import('ora').Ora} logger
 */
async function downloadTargetMint(logger) {
  fse.emptyDirSync(MINT_PATH);
  logger.text = "Downloading Mintlify framework...";
  await pipeline(got.stream(TAR_URL), fse.createWriteStream(TAR_PATH));
  logger.text = "Extracting Mintlify framework...";
  tar.x({
    sync: true,
    file: TAR_PATH,
    cwd: DOT_MINTLIFY,
  });
  fse.removeSync(TAR_PATH);
  fse.writeFileSync(VERSION_PATH, TARGET_MINT_VERSION);

  fse.removeSync(path.join(MINT_PATH, "packages"));
  fse.removeSync(path.join(CLIENT_PATH, "src", "components", "Code"));

  execSync("npm i --force --ignore-scripts mermaid", {
    cwd: MINT_PATH,
    stdio: "inherit",
  });
}

async function build() {
  const logger = buildLogger("Preparing Mintlify...");

  await fse.ensureDir(DOT_MINTLIFY);
  const versionString = (await pathExists(VERSION_PATH))
    ? fse.readFileSync(VERSION_PATH, "utf8")
    : null;

  if (versionString !== TARGET_MINT_VERSION) {
    await downloadTargetMint(logger);
  }

  fse.emptydirSync(NEXT_PUBLIC_PATH);
  fse.emptydirSync(NEXT_PROPS_PATH);
  process.chdir(CLIENT_PATH);

  try {
    await prebuild(CMD_EXEC_PATH);
  } catch (err) {
    const errorText =
      err instanceof Error && err.message
        ? err.message
        : "Prebuild step failed";
    logger.fail(errorText);
    process.exit(1);
  }

  const NEXT_BUILD_PATH = path.join(
    NEXT_SIDE_EFFECT_PATH,
    "..",
    "..",
    "build",
    "index.js"
  );

  const buildModule = await import(NEXT_BUILD_PATH);
  const nextBuild = buildModule.default.default;
  await nextBuild(CLIENT_PATH);

  logger.succeed("Built, but where...");
}

await build();
