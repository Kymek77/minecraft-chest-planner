import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const generatorDirectory = resolve(process.env.GENERATOR_DIR || '../minecraft-data-generator');
const outputDirectory = resolve(process.env.OUTPUT_DIR || 'public/minecraft-data');
const manifestUrl = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
};

const manifestResponse = await fetch(manifestUrl);
if (!manifestResponse.ok) throw new Error(`Unable to load Mojang version manifest (${manifestResponse.status})`);
const manifest = await manifestResponse.json();
const latestRelease = manifest.latest.release;
const generatorVersionDirectory = join(generatorDirectory, 'mc', latestRelease);

if (!existsSync(generatorVersionDirectory)) {
  run('npm', ['install'], generatorDirectory);
  run('npm', ['run', 'bump', '--', latestRelease], generatorDirectory);
}

if (!existsSync(generatorVersionDirectory)) {
  throw new Error(`minecraft-data-generator does not support ${latestRelease} yet.`);
}

const gradleCommand = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
if (process.platform !== 'win32') chmodSync(join(generatorDirectory, 'gradlew'), 0o755);
run(gradleCommand, [`:mc:${latestRelease}:runServer`], generatorDirectory);

const generatedItems = join(generatorVersionDirectory, 'run', 'minecraft-data', 'items.json');
if (!existsSync(generatedItems)) {
  throw new Error(`The generator completed without producing items.json for ${latestRelease}.`);
}

const targetDirectory = join(outputDirectory, latestRelease);
mkdirSync(targetDirectory, { recursive: true });
cpSync(generatedItems, join(targetDirectory, 'items.json'));

const versionsPath = join(outputDirectory, 'versions.json');
const existingVersions = existsSync(versionsPath)
  ? JSON.parse(readFileSync(versionsPath, 'utf8'))
  : [];
const versions = [...new Set([...existingVersions, latestRelease])];
writeFileSync(versionsPath, `${JSON.stringify(versions, null, 2)}\n`);
console.log(`Generated and staged minecraft-data item data for ${latestRelease}.`);
