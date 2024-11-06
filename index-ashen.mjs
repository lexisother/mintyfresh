// Using a public repository containing Mintlify's old client. Apparently version 0.0.9.

import Ora from "ora";
import fse, { pathExists } from "fs-extra";
import { pipeline } from "node:stream/promises";
import got from "got";
import path from "node:path";
import { execSync } from "node:child_process";
import * as tar from "tar";
import {
  CMD_EXEC_PATH,
  DOT_MINTLIFY,
  MINT_PATH,
  NEXT_PROPS_PATH,
  NEXT_PUBLIC_PATH,
  TAR_PATH,
  VERSION_PATH,
} from "@mintlify/previewing/dist/constants.js";

const CLIENT_PATH = path.join(MINT_PATH, "client");
const NEXT_DIST_SERVER_PATH = path.join(
  CLIENT_PATH,
  "node_modules",
  "next",
  "dist",
  "server"
);
const NEXT_SIDE_EFFECT_PATH = path.join(NEXT_DIST_SERVER_PATH, "next.js");
const TARGET_MINT_VERSION = "0.0.9";

function buildLogger(startText = "") {
  return Ora().start(startText);
}

/**
 * @param {import('ora').Ora} logger
 */
async function downloadTargetMint(logger) {
  await fse.ensureDir(MINT_PATH);
  fse.emptyDirSync(MINT_PATH);

  logger.text = "Downloading Mintlify framework...";
  await pipeline(
    got.stream("https://github.com/lleyton/mint/tarball/ashen"),
    fse.createWriteStream(TAR_PATH)
  );
  logger.succeed("Downloaded Mintlify framework!");

  logger.start("Extracting Mintlify framework...");
  tar.x({
    sync: true,
    file: TAR_PATH,
    cwd: MINT_PATH,
    stripComponents: 1,
  });
  fse.removeSync(TAR_PATH);

  fse.writeFileSync(VERSION_PATH, TARGET_MINT_VERSION);

  const eslintConfig = JSON.parse(
    fse.readFileSync(path.join(CLIENT_PATH, ".eslintrc.json")).toString()
  );
  eslintConfig.rules = {
    "@typescript-eslint/no-explicit-any": "off",
    "unused-imports/no-unused-vars": "off",
  };
  fse.writeFileSync(
    path.join(CLIENT_PATH, ".eslintrc.json"),
    JSON.stringify(eslintConfig)
  );

  logger.succeed("Extracted Mintlify framework!");

  // fse.removeSync(path.join(MINT_PATH, "packages"));
  // fse.removeSync(path.join(CLIENT_PATH, "src", "components", "Code"));

  execSync("yarn install", {
    cwd: CLIENT_PATH,
    stdio: "inherit",
  });

  execSync(`yarn preconfigure ${CMD_EXEC_PATH}`, {
    cwd: CLIENT_PATH,
    stdio: "inherit",
  });

  process.exit();
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
