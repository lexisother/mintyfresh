// https://www.npmjs.com/package/@mintlify/previewing
// https://www.npmjs.com/package/@mintlify/prebuild

import Ora from 'ora';
import fse from "fs-extra"
import { pipeline } from 'node:stream/promises';
import got from 'got';
import tar from 'tar';
import { DOT_MINTLIFY, MINT_PATH, TARGET_MINT_VERSION, TAR_PATH, VERSION_PATH } from "@mintlify/previewing/dist/constants"

function buildLogger(startText = '') {
    return Ora().start(startText);
}

/**
 * @param {import('ora').Ora} logger 
 */
async function downloadTargetMint(logger) {
    fse.emptyDirSync(MINT_PATH);
    logger.text = 'Downloading Mintlify framework...';
    yield pipeline(got.stream(TAR_URL), fse.createWriteStream(TAR_PATH));
    logger.text = 'Extracting Mintlify framework...';
    tar.x({
        sync: true,
        file: TAR_PATH,
        cwd: DOT_MINTLIFY,
    });
    fse.removeSync(TAR_PATH);
    fse.writeFileSync(VERSION_PATH, TARGET_MINT_VERSION);
}