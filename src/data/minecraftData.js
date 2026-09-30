import { minecraftItems as fallbackItems } from './minecraftItems';

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

const technicalPatterns = [
  'barrier',
  'bedrock',
  'command_block',
  'debug_stick',
  'end_portal_frame',
  'jigsaw',
  'knowledge_book',
  'light',
  'structure_block',
  'structure_void',
];

const foodPatterns = [
  'apple',
  'beef',
  'bread',
  'cake',
  'carrot',
  'chicken',
  'cod',
  'cookie',
  'fish',
  'melon_slice',
  'mushroom_stew',
  'mutton',
  'porkchop',
  'potato',
  'pumpkin_pie',
  'rabbit',
  'salmon',
  'stew',
  'sweet_berries',
];

const mobDropPatterns = [
  'blaze_rod',
  'bone',
  'ender_pearl',
  'feather',
  'ghast_tear',
  'gunpowder',
  'leather',
  'magma_cream',
  'phantom_membrane',
  'rabbit_foot',
  'rotten_flesh',
  'shulker_shell',
  'slime_ball',
  'spider_eye',
  'string',
];

const findPattern = (name, patterns) => patterns.find((pattern) => name.includes(pattern));

const displayNameFromId = (name) =>
  name
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const classifyBaseMinecraftItem = (item) => {
  const name = item.name.toLowerCase();
  const displayName = item.displayName || name;
  const id = `minecraft:${item.name}`;

  if (technicalPatterns.some((pattern) => name.includes(pattern))) {
    nonSurvivalItemIds.add(id);
    return { category: 'Technical', subcategory: 'Command-only' };
  }

  if (item.enchantCategories?.some((category) => category.includes('armor'))) {
    return { category: 'Combat', subcategory: 'Armor' };
  }

  if (item.enchantCategories?.some((category) => ['weapon', 'sword', 'bow', 'crossbow', 'trident', 'mace'].includes(category))) {
    return { category: 'Combat', subcategory: 'Weapons' };
  }

  if (item.enchantCategories?.some((category) => ['mining', 'fishing'].includes(category))) {
    const subcategory = name.includes('pickaxe')
      ? 'Pickaxes'
      : name.includes('axe')
        ? 'Axes'
        : name.includes('shovel')
          ? 'Shovels'
          : name.includes('hoe')
            ? 'Hoes'
            : 'Tools';
    return { category: 'Tools', subcategory };
  }

  const foodPattern = findPattern(name, foodPatterns);
  if (foodPattern || name.includes('potion')) {
    return {
      category: 'Food',
      subcategory: name.includes('cooked_') ? 'Cooked food' : 'Consumables',
    };
  }

  const mobDropPattern = findPattern(name, mobDropPatterns);
  if (mobDropPattern || name.endsWith('_scute') || name.endsWith('_head')) {
    return { category: 'Mob Drops', subcategory: 'Drops' };
  }

  if (name.includes('redstone') || ['piston', 'observer', 'hopper', 'dispenser', 'dropper', 'crafter', 'tnt'].some((part) => name.includes(part))) {
    return { category: 'Mechanics', subcategory: 'Redstone' };
  }

  if (name.includes('ore') || ['ingot', 'nugget', 'raw_', '_block'].some((part) => name.includes(part)) && ['iron', 'gold', 'copper', 'diamond', 'emerald', 'netherite', 'coal', 'lapis'].some((part) => name.includes(part))) {
    return { category: 'Resources', subcategory: name.includes('ore') ? 'Ores' : 'Materials' };
  }

  if (name.includes('seed') || ['wheat', 'beetroot', 'cactus', 'sugar_cane', 'kelp', 'bamboo'].some((part) => name.includes(part))) {
    return { category: 'Farming', subcategory: 'Crops' };
  }

  if (name.includes('dye') || name.includes('banner') || name.includes('painting') || name.includes('disc')) {
    return { category: 'Decor', subcategory: 'Decoration' };
  }

  if (name.includes('log') || name.includes('plank') || name.includes('wood') || name.includes('stem') || name.includes('hyphae')) {
    return { category: 'Wood', subcategory: 'Wood sets' };
  }

  if (name.includes('boat') || name.includes('minecart') || name.includes('rail')) {
    return { category: 'Utility', subcategory: 'Transport' };
  }

  if (name.includes('bucket') || name.includes('torch') || name.includes('lantern') || name.includes('campfire') || name.includes('compass')) {
    return { category: 'Utility', subcategory: 'Utility' };
  }

  if (name.includes('nether') || ['netherrack', 'basalt', 'blackstone', 'soul_sand', 'soul_soil', 'crimson', 'warped'].some((part) => name.includes(part))) {
    return { category: 'Nether', subcategory: 'Nether blocks' };
  }

  if (name.includes('diamond') || name.includes('emerald') || name.includes('netherite') || name.includes('echo_shard') || name.includes('dragon_egg')) {
    return { category: 'Rare', subcategory: 'Rare items' };
  }

  if (displayName.includes('Block') || ['stone', 'dirt', 'sand', 'glass', 'brick', 'terracotta', 'slab', 'stairs', 'wall'].some((part) => name.includes(part))) {
    return { category: 'Building', subcategory: 'Building blocks' };
  }

  return { category: 'Utility', subcategory: 'Miscellaneous' };
};

const woodMaterials = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'cherry', 'pale_oak', 'dark_oak', 'mangrove', 'bamboo', 'crimson', 'warped', 'poplar'];
const colorMaterials = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];

const findMaterial = (name, materials) => {
  const match = materials.find((material) => name === material || name.startsWith(`${material}_`) || name.includes(`_${material}_`));
  return match ? match.replaceAll('_', ' ') : null;
};

const deriveItemFacets = (item, baseClassification) => {
  const name = item.name.toLowerCase();
  const material = findMaterial(name, woodMaterials) || findMaterial(name, colorMaterials);
  const dimension = name.includes('nether') || ['netherrack', 'basalt', 'blackstone', 'soul_sand', 'soul_soil', 'crimson', 'warped', 'blaze', 'ghast', 'magma'].some((part) => name.includes(part))
    ? 'Nether'
    : name.includes('end_') || name.includes('ender') || name.includes('chorus') || name.includes('dragon')
      ? 'End'
      : name.includes('sculk') || name.includes('echo_shard')
        ? 'Deep Dark'
        : name.includes('prismarine') || name.includes('coral') || name.includes('kelp') || name.includes('sea_')
          ? 'Ocean'
          : 'Overworld';
  const form = name.includes('hanging_sign')
    ? 'Hanging Sign'
    : name.includes('fence_gate')
      ? 'Fence Gate'
      : name.includes('trapdoor')
        ? 'Trapdoor'
        : name.endsWith('_door') || name === 'iron_door'
          ? 'Door'
          : name.includes('pressure_plate')
            ? 'Pressure Plate'
            : name.endsWith('_button')
              ? 'Button'
              : name.endsWith('_stairs')
                ? 'Stairs'
                : name.endsWith('_slab')
                  ? 'Slab'
                  : name.endsWith('_wall')
                    ? 'Wall'
                    : name.endsWith('_fence')
                      ? 'Fence'
                      : name.endsWith('_sign')
                        ? 'Sign'
                        : name.includes('log') || name.includes('stem') || name.includes('hyphae')
                          ? 'Log'
                          : name.includes('plank')
                            ? 'Planks'
                            : name.includes('ore')
                              ? 'Ore'
                              : name.includes('ingot')
                                ? 'Ingot'
                                : name.includes('nugget')
                                  ? 'Nugget'
                                  : name.includes('block')
                                    ? 'Block'
                                    : 'Base';
  const family = baseClassification.category === 'Building'
    ? (material || (name.includes('stone') || name.includes('deepslate') ? 'Stone' : name.includes('glass') ? 'Glass' : name.includes('terracotta') || name.includes('concrete') ? 'Colored Blocks' : dimension === 'Nether' ? 'Nether Blocks' : 'General Building'))
    : baseClassification.category === 'Resources'
      ? (name.includes('ore') ? 'Ores' : name.includes('ingot') || name.includes('nugget') ? 'Metals' : name.includes('diamond') || name.includes('emerald') ? 'Gems' : 'Materials')
      : baseClassification.subcategory;
  const category = baseClassification.category === 'Wood' || baseClassification.category === 'Nether'
    ? (form !== 'Base' || name.includes('block') || name.includes('stone') || name.includes('plank') || name.includes('log') || name.includes('stem') ? 'Building' : baseClassification.category === 'Wood' ? 'Farming' : 'Resources')
    : baseClassification.category === 'Rare'
      ? (name.includes('ore') || name.includes('ingot') || name.includes('shard') ? 'Resources' : 'Decor')
      : baseClassification.category;

  return {
    category,
    subcategory: family || baseClassification.subcategory,
    family: family || 'General',
    material,
    form,
    dimension,
    rarity: baseClassification.category === 'Technical' ? 'Technical' : baseClassification.category === 'Rare' ? 'Rare' : 'Common',
  };
};

export const classifyMinecraftItem = (item) => deriveItemFacets(item, classifyBaseMinecraftItem(item));

const normalizeItem = (item) => {
  const classification = classifyMinecraftItem(item);
  return {
    id: `minecraft:${item.name}`,
    name: item.displayName || item.name,
    ...classification,
    stack: item.stackSize || 64,
    maxDurability: item.maxDurability || null,
  };
};

export const itemCategories = [
  'Building',
  'Resources',
  'Mechanics',
  'Combat',
  'Food',
  'Utility',
  'Mob Drops',
  'Decor',
  'Rare',
  'Tools',
  'Farming',
  'Technical',
  'Unclassified',
];

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
    const response = await fetch(`${MINECRAFT_DATA_REPO}/${encodeURIComponent(version)}/items.json`);
    if (response.ok) {
      const items = await response.json();
      return {
        items: items.filter((item) => item.name !== 'air').map(normalizeItem),
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
        ? normalizeItem(metadataByName[name])
        : {
            id: `minecraft:${name}`,
            name: displayNameFromId(name),
            category: 'Unclassified',
            subcategory: 'Needs review',
            stack: 64,
            maxDurability: null,
          }),
    source: metadataFallbackVersion
      ? `mcmeta (metadata cross-checked with minecraft-data ${metadataFallbackVersion})`
      : 'mcmeta',
    unclassifiedCount: unclassifiedNames.length,
  };
};

export const fallbackMinecraftItems = fallbackItems;
