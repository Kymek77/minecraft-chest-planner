const manifestUrl = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const dataVersionsUrl = 'https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/common/versions.json';
const mcmetaVersionsUrl = 'https://raw.githubusercontent.com/misode/mcmeta/summary/versions/data.json';

const [manifestResponse, dataVersionsResponse, mcmetaVersionsResponse] = await Promise.all([
  fetch(manifestUrl),
  fetch(dataVersionsUrl),
  fetch(mcmetaVersionsUrl),
]);

if (!manifestResponse.ok || !dataVersionsResponse.ok || !mcmetaVersionsResponse.ok) {
  throw new Error('Unable to read Mojang or minecraft-data version metadata.');
}

const manifest = await manifestResponse.json();
const dataVersions = await dataVersionsResponse.json();
const mcmetaVersions = await mcmetaVersionsResponse.json();
const publicReleases = manifest.versions
  .filter((version) => version.type === 'release')
  .map((version) => version.id);
const supportedReleases = dataVersions.filter((version) => publicReleases.includes(version));
const mcmetaReleases = mcmetaVersions
  .filter((version) => version.stable && publicReleases.includes(version.id))
  .map((version) => version.id);
const latestPublic = manifest.latest.release;
const latestMinecraftData = supportedReleases.at(-1);
const latestAvailable = publicReleases.find((version) =>
  supportedReleases.includes(version) || mcmetaReleases.includes(version));
const lagging = latestPublic !== latestAvailable;

console.log(`### Minecraft data coverage`);
console.log(`- Latest public release: **${latestPublic}**`);
console.log(`- Latest minecraft-data release: **${latestMinecraftData}**`);
console.log(`- Latest available item source: **${latestAvailable}**`);
console.log(`- minecraft-data releases: **${supportedReleases.length}**`);
console.log(`- mcmeta releases: **${mcmetaReleases.length}**`);
console.log(`- Status: **${lagging ? 'Upstream data is waiting for a new version' : 'Current'}**`);

if (lagging) {
  console.log(`- The planner will continue using ${latestAvailable} until an item source publishes ${latestPublic}.`);
}
