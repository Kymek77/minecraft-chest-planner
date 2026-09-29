const manifestUrl = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const dataVersionsUrl = 'https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/common/versions.json';

const [manifestResponse, dataVersionsResponse] = await Promise.all([
  fetch(manifestUrl),
  fetch(dataVersionsUrl),
]);

if (!manifestResponse.ok || !dataVersionsResponse.ok) {
  throw new Error('Unable to read Mojang or minecraft-data version metadata.');
}

const manifest = await manifestResponse.json();
const dataVersions = await dataVersionsResponse.json();
const publicReleases = manifest.versions
  .filter((version) => version.type === 'release')
  .map((version) => version.id);
const supportedReleases = dataVersions.filter((version) => publicReleases.includes(version));
const latestPublic = manifest.latest.release;
const latestSupported = supportedReleases.at(-1);
const lagging = latestPublic !== latestSupported;

console.log(`### Minecraft data coverage`);
console.log(`- Latest public release: **${latestPublic}**`);
console.log(`- Latest minecraft-data release: **${latestSupported}**`);
console.log(`- Supported public releases: **${supportedReleases.length}**`);
console.log(`- Status: **${lagging ? 'Upstream data is waiting for a new version' : 'Current'}**`);

if (lagging) {
  console.log(`- The planner will continue using ${latestSupported} until minecraft-data publishes ${latestPublic}/items.json.`);
}
