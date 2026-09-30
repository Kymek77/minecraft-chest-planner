import { minecraftItems as fallbackItems } from './minecraftItems.js';

export const MINECRAFT_DATA_REPO =
  'https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc';
export const MOJANG_VERSION_MANIFEST =
  'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
export const MCMETA_REPO = 'https://raw.githubusercontent.com/misode/mcmeta';

export const nonSurvivalItemIds = new Set([
  'minecraft:barrier',
  'minecraft:bedrock',
  'minecraft:chain_command_block',
  'minecraft:command_block',
  'minecraft:debug_stick',
  'minecraft:end_portal_frame',
  'minecraft:jigsaw',
  'minecraft:knowledge_book',
  'minecraft:light',
  'minecraft:repeating_command_block',
  'minecraft:structure_block',
  'minecraft:structure_void',
]);

const displayNameFromId = (name) =>
  name
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const normalizeItem = (item, source = 'minecraft-data', blockNames = new Set()) => {
  const id = typeof item.id === 'string' && item.id.includes(':') ? item.id : `minecraft:${item.name}`;
  const itemName = id.replace(/^minecraft:/, '');
  return {
    id,
    name: item.displayName || item.name || displayNameFromId(itemName),
    stack: item.stackSize || item.stack || 64,
    maxDurability: item.maxDurability || null,
    enchantCategories: Array.isArray(item.enchantCategories) ? item.enchantCategories : [],
    isBlock: blockNames.has(itemName),
    source,
  };
};

export const fetchMinecraftVersions = async () => {
  const [minecraftDataVersions, mcmetaVersions] = await Promise.all([
    fetchMinecraftDataVersions(),
    fetch(`${MCMETA_REPO}/summary/versions/data.json`).then((response) => {
      if (!response.ok) throw new Error(`mcmeta versions (${response.status})`);
      return response.json();
    }),
  ]);

  return [...new Set([
    ...minecraftDataVersions,
    ...mcmetaVersions.filter((version) => version.stable).map((version) => version.id),
  ])];
};

export const fetchMinecraftDataVersions = async () => {
  const response = await fetch(`${MINECRAFT_DATA_REPO}/common/versions.json`);
  if (!response.ok) throw new Error(`Unable to load minecraft-data versions (${response.status})`);
  return response.json();
};

export const fetchMojangReleaseVersions = async () => {
  const response = await fetch(MOJANG_VERSION_MANIFEST);
  if (!response.ok) throw new Error(`Unable to load Mojang version manifest (${response.status})`);

  const manifest = await response.json();
  return {
    latestRelease: manifest.latest.release,
    releases: manifest.versions
      .filter((version) => version.type === 'release')
      .map((version) => version.id),
  };
};

export const fetchMinecraftItems = async (version, metadataFallbackVersion) => {
  try {
    const [response, blocksResponse] = await Promise.all([
      fetch(`${MINECRAFT_DATA_REPO}/${encodeURIComponent(version)}/items.json`),
      fetch(`${MINECRAFT_DATA_REPO}/${encodeURIComponent(version)}/blocks.json`),
    ]);
    if (response.ok) {
      const [items, blocks] = await Promise.all([
        response.json(),
        blocksResponse.ok ? blocksResponse.json() : [],
      ]);
      const blockNames = new Set(blocks.map((block) => block.name));
      return {
        items: items.filter((item) => item.name !== 'air').map((item) => normalizeItem(item, 'minecraft-data', blockNames)),
        source: 'minecraft-data',
      };
    }
  } catch (error) {
    // Try mcmeta when minecraft-data is unavailable for this version.
  }

  const [mcmetaResponse, mcmetaBlocksResponse, metadataResponse, metadataBlocksResponse] = await Promise.all([
    fetch(`${MCMETA_REPO}/${encodeURIComponent(version)}-registries/item/data.json`),
    fetch(`${MCMETA_REPO}/${encodeURIComponent(version)}-registries/block/data.json`),
    metadataFallbackVersion
      ? fetch(`${MINECRAFT_DATA_REPO}/${encodeURIComponent(metadataFallbackVersion)}/items.json`)
      : Promise.resolve(null),
    metadataFallbackVersion
      ? fetch(`${MINECRAFT_DATA_REPO}/${encodeURIComponent(metadataFallbackVersion)}/blocks.json`)
      : Promise.resolve(null),
  ]);

  const response = mcmetaResponse;
  if (!response.ok) throw new Error(`Unable to load Minecraft ${version} item data from either source.`);

  const itemNames = await response.json();
  const metadataItems = metadataResponse?.ok ? await metadataResponse.json() : [];
  const mcmetaBlockNames = mcmetaBlocksResponse.ok ? new Set(await mcmetaBlocksResponse.json()) : new Set();
  const metadataBlockNames = metadataBlocksResponse?.ok ? new Set((await metadataBlocksResponse.json()).map((block) => block.name)) : new Set();
  const blockNames = new Set([...mcmetaBlockNames, ...metadataBlockNames]);
  const metadataByName = Object.fromEntries(metadataItems.map((item) => [item.name, item]));
  const unclassifiedNames = itemNames.filter((name) => name !== 'air' && !metadataByName[name]);

  return {
    items: itemNames
      .filter((name) => name !== 'air')
      .map((name) => metadataByName[name]
        ? normalizeItem(metadataByName[name], 'minecraft-data', blockNames)
        : normalizeItem({ name, displayName: displayNameFromId(name) }, 'mcmeta', blockNames)),
    source: metadataFallbackVersion
      ? `mcmeta (metadata cross-checked with minecraft-data ${metadataFallbackVersion})`
      : 'mcmeta',
    unclassifiedCount: unclassifiedNames.length,
  };
};

export const fallbackMinecraftItems = fallbackItems.map((item) => normalizeItem(item));
