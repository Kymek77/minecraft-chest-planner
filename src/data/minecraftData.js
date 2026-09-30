import { minecraftItems as fallbackItems } from './minecraftItems.js';

export const MINECRAFT_DATA_REPO =
  'https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc';
export const MOJANG_VERSION_MANIFEST =
  'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
export const MCMETA_REPO = 'https://raw.githubusercontent.com/misode/mcmeta';

const displayNameFromId = (name) =>
  name
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const normalizeItem = (item, tags = [], source = 'minecraft-data') => {
  const id = typeof item.id === 'string' && item.id.includes(':') ? item.id : `minecraft:${item.name}`;
  const itemName = id.replace(/^minecraft:/, '');
  return {
    id,
    name: item.displayName || item.name || displayNameFromId(itemName),
    stack: item.stackSize || item.stack || 64,
    maxDurability: item.maxDurability || null,
    enchantCategories: Array.isArray(item.enchantCategories) ? item.enchantCategories : [],
    tags: Array.isArray(tags) ? tags : [],
    source,
  };
};

const normalizeTagValue = (value) => (typeof value === 'string' ? value : value?.id || null)?.replace(/^minecraft:/, '');

const fetchMinecraftItemTags = async (version) => {
  const tagListResponse = await fetch(`${MCMETA_REPO}/${encodeURIComponent(version)}-registries/tag/item/data.json`);
  if (!tagListResponse.ok) throw new Error(`Unable to load Minecraft ${version} item tag registry.`);

  const tagNames = await tagListResponse.json();
  const tagEntries = await Promise.all(
    tagNames.map(async (tag) => {
      const response = await fetch(`${MCMETA_REPO}/${encodeURIComponent(version)}-data/data/minecraft/tags/item/${tag}.json`);
      if (!response.ok) return [tag, []];
      const data = await response.json();
      return [tag, data.values || []];
    }),
  );
  const valuesByTag = Object.fromEntries(tagEntries);
  const resolveTag = (tag, seen = new Set()) => {
    if (seen.has(tag)) return [];
    const nextSeen = new Set(seen).add(tag);
    return (valuesByTag[tag] || []).flatMap((value) => {
      const normalizedValue = normalizeTagValue(value);
      if (!normalizedValue) return [];
      return normalizedValue.startsWith('#')
        ? resolveTag(normalizedValue.slice(1), nextSeen)
        : [normalizedValue];
    });
  };
  const tagsByItem = {};
  tagNames.forEach((tag) => {
    resolveTag(tag).forEach((itemName) => {
      if (!tagsByItem[itemName]) tagsByItem[itemName] = [];
      tagsByItem[itemName].push(tag);
    });
  });
  return tagsByItem;
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
  const tagsByItem = await fetchMinecraftItemTags(version).catch(() => ({}));
  try {
    const response = await fetch(`${MINECRAFT_DATA_REPO}/${encodeURIComponent(version)}/items.json`);
    if (response.ok) {
      const items = await response.json();
      return {
        items: items.filter((item) => item.name !== 'air').map((item) => normalizeItem(item, tagsByItem[item.name] || [])),
        source: 'minecraft-data',
      };
    }
  } catch (error) {
    // Try mcmeta when minecraft-data is unavailable for this version.
  }

  const [mcmetaResponse, metadataResponse] = await Promise.all([
    fetch(`${MCMETA_REPO}/${encodeURIComponent(version)}-registries/item/data.json`),
    metadataFallbackVersion
      ? fetch(`${MINECRAFT_DATA_REPO}/${encodeURIComponent(metadataFallbackVersion)}/items.json`)
      : Promise.resolve(null),
  ]);

  const response = mcmetaResponse;
  if (!response.ok) throw new Error(`Unable to load Minecraft ${version} item data from either source.`);

  const itemNames = await response.json();
  const metadataItems = metadataResponse?.ok ? await metadataResponse.json() : [];
  const metadataByName = Object.fromEntries(metadataItems.map((item) => [item.name, item]));
  const unclassifiedNames = itemNames.filter((name) => name !== 'air' && !metadataByName[name]);

  return {
    items: itemNames
      .filter((name) => name !== 'air')
      .map((name) => metadataByName[name]
        ? normalizeItem(metadataByName[name], tagsByItem[name] || [])
        : normalizeItem({ name, displayName: displayNameFromId(name) }, tagsByItem[name] || [], 'mcmeta')),
    source: metadataFallbackVersion
      ? `mcmeta (metadata cross-checked with minecraft-data ${metadataFallbackVersion})`
      : 'mcmeta',
    unclassifiedCount: unclassifiedNames.length,
  };
};

export const fallbackMinecraftItems = fallbackItems.map((item) => normalizeItem(item));
