import { minecraftItems as fallbackItems } from './minecraftItems.js';

export const MINECRAFT_DATA_REPO =
  'https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc';
export const MOJANG_VERSION_MANIFEST =
  'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
export const MCMETA_REPO = 'https://raw.githubusercontent.com/misode/mcmeta';

const mcmetaItemTags = [
  'axes', 'pickaxes', 'shovels', 'hoes', 'swords', 'spears', 'bows', 'crossbows',
  'head_armor', 'chest_armor', 'leg_armor', 'foot_armor', 'trimmable_armor',
  'planks', 'logs', 'buttons', 'wooden_buttons', 'pressure_plates', 'wooden_pressure_plates',
  'stairs', 'wooden_stairs', 'slabs', 'wooden_slabs', 'walls', 'fences', 'wooden_fences',
  'fence_gates', 'wooden_doors', 'doors', 'wooden_trapdoors', 'trapdoors', 'signs',
  'hanging_signs', 'rails', 'boats', 'chest_boats', 'shulker_boxes',
  'ores', 'coal_ores', 'iron_ores', 'gold_ores', 'copper_ores', 'diamond_ores', 'emerald_ores', 'lapis_ores', 'redstone_ores',
  'redstone_ores', 'dyes', 'flowers', 'small_flowers', 'saplings', 'crops', 'meat', 'fishes',
  'arrows', 'banners', 'candles', 'lanterns', 'wool', 'wool_carpets', 'concrete', 'concrete_powders',
  'concrete_slabs', 'concrete_stairs', 'terracotta', 'glazed_terracotta', 'swords', 'pickaxes',
  'enchantable/armor', 'enchantable/melee_weapon', 'enchantable/mining', 'enchantable/equippable',
];

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

const hasNamePart = (name, part) => new RegExp(`(^|_)${part.split('_').join('_')}($|_)`).test(name);

const hasNamePhrase = (name, phrase) => hasNamePart(name, phrase);

const findPattern = (name, patterns) => patterns.find((pattern) => hasNamePhrase(name, pattern));

const displayNameFromId = (name) =>
  name
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const classifyBaseMinecraftItem = (item) => {
  const name = item.name.toLowerCase();
  const displayName = item.displayName || name;
  const id = `minecraft:${item.name}`;
  const tags = new Set(item.tags || []);

  if (technicalPatterns.some((pattern) => hasNamePhrase(name, pattern))) {
    nonSurvivalItemIds.add(id);
    return { category: 'Technical', subcategory: 'Command-only' };
  }

  if (['head_armor', 'chest_armor', 'leg_armor', 'foot_armor', 'trimmable_armor'].some((tag) => tags.has(tag))) {
    return { category: 'Combat', subcategory: 'Armor' };
  }

  if (['swords', 'spears', 'bows', 'crossbows', 'enchantable/melee_weapon', 'enchantable/weapon'].some((tag) => tags.has(tag))) {
    return { category: 'Combat', subcategory: 'Weapons' };
  }

  if (['axes', 'pickaxes', 'shovels', 'hoes', 'enchantable/mining'].some((tag) => tags.has(tag))) {
    return { category: 'Tools', subcategory: tags.has('pickaxes') ? 'Pickaxes' : tags.has('hoes') ? 'Hoes' : tags.has('axes') ? 'Axes' : 'Tools' };
  }

  if (['planks', 'logs', 'stairs', 'slabs', 'walls', 'fences', 'fence_gates', 'doors', 'trapdoors', 'buttons', 'pressure_plates', 'signs', 'hanging_signs', 'concrete', 'terracotta', 'glazed_terracotta', 'wool', 'wool_carpets'].some((tag) => tags.has(tag))) {
    return { category: 'Building', subcategory: tags.has('planks') || tags.has('logs') ? 'Wood' : tags.has('terracotta') || tags.has('concrete') ? 'Colored Blocks' : 'Building Forms' };
  }

  if (['ores', 'coal_ores', 'iron_ores', 'gold_ores', 'copper_ores', 'diamond_ores', 'emerald_ores', 'lapis_ores', 'redstone_ores'].some((tag) => tags.has(tag))) {
    return { category: 'Resources', subcategory: 'Ores' };
  }

  if (['flowers', 'small_flowers', 'saplings', 'crops'].some((tag) => tags.has(tag))) {
    return { category: 'Farming', subcategory: 'Plants and Crops' };
  }

  if (['dyes', 'banners'].some((tag) => tags.has(tag))) {
    return { category: 'Decor', subcategory: 'Color and Patterns' };
  }

  if (item.enchantCategories?.some((category) => category.includes('armor'))) {
    return { category: 'Combat', subcategory: 'Armor' };
  }

  if (item.enchantCategories?.some((category) => ['weapon', 'sword', 'bow', 'crossbow', 'trident', 'mace'].includes(category))) {
    return { category: 'Combat', subcategory: 'Weapons' };
  }

  if (item.enchantCategories?.some((category) => ['mining', 'fishing'].includes(category))) {
    const subcategory = hasNamePart(name, 'pickaxe')
      ? 'Pickaxes'
      : hasNamePart(name, 'axe')
        ? 'Axes'
        : hasNamePart(name, 'shovel')
          ? 'Shovels'
          : hasNamePart(name, 'hoe')
            ? 'Hoes'
            : 'Tools';
    return { category: 'Tools', subcategory };
  }

  return { category: 'Unclassified', subcategory: 'Needs review' };
};

const woodMaterials = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'cherry', 'pale_oak', 'dark_oak', 'mangrove', 'bamboo', 'crimson', 'warped', 'poplar'];
const colorMaterials = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];

const findMaterial = (name, materials) => {
  const match = materials.find((material) => hasNamePart(name, material));
  return match ? match.replaceAll('_', ' ').replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()) : null;
};

const deriveItemFacets = (item, baseClassification) => {
  const name = item.name.toLowerCase();
  const tags = new Set(item.tags || []);
  const material = findMaterial(name, woodMaterials);
  const color = findMaterial(name, colorMaterials);
  const dimension = hasNamePart(name, 'nether') || ['netherrack', 'basalt', 'blackstone', 'soul_sand', 'soul_soil', 'crimson', 'warped', 'blaze', 'ghast', 'magma'].some((part) => hasNamePhrase(name, part))
    ? 'Nether'
    : name.startsWith('end_') || hasNamePart(name, 'ender') || hasNamePart(name, 'chorus') || hasNamePart(name, 'dragon')
      ? 'End'
      : hasNamePart(name, 'sculk') || hasNamePart(name, 'echo_shard')
        ? 'Deep Dark'
        : hasNamePart(name, 'prismarine') || hasNamePart(name, 'coral') || hasNamePart(name, 'kelp') || name.startsWith('sea_')
          ? 'Ocean'
          : 'Overworld';
  const form = hasNamePart(name, 'hanging_sign')
    ? 'Hanging Sign'
    : hasNamePart(name, 'fence_gate')
      ? 'Fence Gate'
      : hasNamePart(name, 'trapdoor')
        ? 'Trapdoor'
        : name.endsWith('_door') || name === 'iron_door'
          ? 'Door'
          : hasNamePart(name, 'pressure_plate')
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
                        : ['log', 'logs', 'stem', 'stems', 'hyphae'].some((part) => hasNamePart(name, part))
                          ? 'Log'
                          : hasNamePart(name, 'planks') || hasNamePart(name, 'plank')
                            ? 'Planks'
                            : hasNamePart(name, 'ore')
                              ? 'Ore'
                              : hasNamePart(name, 'ingot')
                                ? 'Ingot'
                                : hasNamePart(name, 'nugget')
                                  ? 'Nugget'
                                  : hasNamePart(name, 'block')
                                    ? 'Block'
                                    : 'Base';
  const structuralTags = ['planks', 'logs', 'stairs', 'slabs', 'walls', 'fences', 'fence_gates', 'doors', 'trapdoors', 'buttons', 'pressure_plates', 'signs', 'hanging_signs', 'concrete', 'terracotta', 'glazed_terracotta', 'wool', 'wool_carpets'];
  const isBuildingMaterial = structuralTags.some((tag) => tags.has(tag));
  const isTechnical = baseClassification.category === 'Technical';
  const isArmor = item.enchantCategories?.some((category) => category.includes('armor')) || ['head_armor', 'chest_armor', 'leg_armor', 'foot_armor', 'trimmable_armor'].some((tag) => tags.has(tag));
  const isWeapon = item.enchantCategories?.some((category) => ['weapon', 'sword', 'bow', 'crossbow', 'trident', 'mace'].includes(category)) ||
    ['swords', 'spears', 'bows', 'crossbows', 'enchantable/melee_weapon', 'enchantable/weapon'].some((tag) => tags.has(tag));
  const isTool = item.enchantCategories?.some((category) => ['mining', 'fishing'].includes(category)) ||
    ['axes', 'pickaxes', 'shovels', 'hoes', 'enchantable/mining'].some((tag) => tags.has(tag));
  const isFood = baseClassification.category === 'Food' || ['meat', 'fishes', 'brewing_potion_inputs'].some((tag) => tags.has(tag));
  const isFarming = baseClassification.category === 'Farming' || ['flowers', 'small_flowers', 'saplings', 'crops', 'villager_plantable_seeds'].some((tag) => tags.has(tag));
  const isRedstone = baseClassification.category === 'Mechanics';
  const isTransport = ['boats', 'chest_boats', 'rails'].some((tag) => tags.has(tag));
  const isMobDrop = baseClassification.category === 'Mob Drops';
  const isDecoration = baseClassification.category === 'Decor' || ['banners', 'dyes', 'candles', 'lanterns'].some((tag) => tags.has(tag));
  const isResource = baseClassification.category === 'Resources' || ['ores', 'coal_ores', 'iron_ores', 'gold_ores', 'copper_ores', 'diamond_ores', 'emerald_ores', 'lapis_ores', 'redstone_ores'].some((tag) => tags.has(tag));

  let category = baseClassification.category;
  let family = baseClassification.subcategory;

  if (isTechnical) {
    category = 'Technical';
    family = 'Command and test items';
  } else if (isArmor) {
    category = 'Combat';
    family = 'Armor';
  } else if (isWeapon) {
    category = 'Combat';
    family = 'Weapons';
  } else if (isTool) {
    category = 'Tools & Equipment';
    family = hasNamePart(name, 'pickaxe') ? 'Mining' : hasNamePart(name, 'hoe') ? 'Farming' : hasNamePart(name, 'fishing') ? 'Fishing' : 'General Tools';
  } else if (isFood) {
    category = 'Food & Brewing';
    family = hasNamePart(name, 'potion') || hasNamePart(name, 'bottle') ? 'Brewing' : name.startsWith('cooked_') ? 'Cooked Food' : hasNamePart(name, 'stew') || hasNamePart(name, 'soup') ? 'Meals' : 'Food';
  } else if (isFarming) {
    category = 'Farming & Nature';
    family = hasNamePart(name, 'sapling') || hasNamePart(name, 'propagule') ? 'Tree Growing' : hasNamePart(name, 'flower') || hasNamePart(name, 'mushroom') || hasNamePart(name, 'fungus') ? 'Plants' : 'Crops';
  } else if (isRedstone) {
    category = 'Redstone & Automation';
    family = hasNamePart(name, 'rail') ? 'Rail Systems' : ['piston', 'observer', 'hopper'].some((part) => hasNamePart(name, part)) ? 'Automation' : 'Redstone';
  } else if (isTransport) {
    category = 'Transport & Storage';
    family = hasNamePart(name, 'rail') ? 'Rail Systems' : hasNamePart(name, 'boat') ? 'Boats' : hasNamePart(name, 'minecart') ? 'Minecarts' : 'Storage';
  } else if (isMobDrop) {
    category = 'Mob Drops';
    family = name.endsWith('_spawn_egg') ? 'Spawn Eggs' : hasNamePart(name, 'head') || hasNamePart(name, 'skull') ? 'Mob Trophies' : 'Mob Materials';
  } else if (isDecoration) {
    category = 'Decoration & Collectibles';
    family = hasNamePart(name, 'dye') || hasNamePart(name, 'banner') ? 'Color and Patterns' : name.startsWith('music_disc_') || hasNamePart(name, 'painting') ? 'Collectibles' : 'Decor';
  } else if (isResource) {
    category = 'Resources';
    family = hasNamePart(name, 'ore') ? 'Ores' : hasNamePart(name, 'ingot') || hasNamePart(name, 'nugget') ? 'Metals' : hasNamePart(name, 'diamond') || hasNamePart(name, 'emerald') ? 'Gems' : 'Materials';
  } else if (isBuildingMaterial) {
    category = 'Building';
    family = material || (hasNamePart(name, 'stone') || hasNamePart(name, 'deepslate') ? 'Stone' : name === 'glass' || hasNamePart(name, 'glass_pane') ? 'Glass' : hasNamePart(name, 'terracotta') ? 'Terracotta' : hasNamePart(name, 'concrete') ? 'Concrete' : dimension === 'Nether' ? 'Nether Blocks' : 'General Building');
  } else if (baseClassification.category === 'Nether') {
    category = 'Resources';
    family = 'Nether Materials';
  } else if (baseClassification.category === 'Rare') {
    category = 'Decoration & Collectibles';
    family = 'Rare and Unique';
  } else if (baseClassification.category === 'Utility') {
    category = 'Tools & Equipment';
    family = 'General Utility';
  }

  return {
    category,
    subcategory: family || baseClassification.subcategory,
    family: family || 'General',
    material,
    color,
    form,
    dimension,
    rarity: baseClassification.category === 'Technical' ? 'Technical' : baseClassification.category === 'Rare' ? 'Rare' : 'Common',
  };
};

export const classifyMinecraftItem = (item) => deriveItemFacets(item, classifyBaseMinecraftItem(item));

const normalizeItem = (item, tags = []) => {
  const classification = classifyMinecraftItem({ ...item, tags: Array.isArray(tags) ? tags : [] });
  return {
    id: `minecraft:${item.name}`,
    name: item.displayName || item.name,
    ...classification,
    stack: item.stackSize || item.stack || 64,
    maxDurability: item.maxDurability || null,
    tags,
  };
};

const fetchMinecraftItemTags = async (version) => {
  const tagEntries = await Promise.all(
    mcmetaItemTags.map(async (tag) => {
      const response = await fetch(`${MCMETA_REPO}/${encodeURIComponent(version)}-data/data/minecraft/tags/item/${tag}.json`);
      if (!response.ok) return [tag, []];
      const data = await response.json();
      return [tag, (data.values || []).map((value) => value.replace(/^minecraft:/, ''))];
    }),
  );
  const tagsByItem = {};
  tagEntries.forEach(([tag, itemNames]) => {
    itemNames.forEach((itemName) => {
      if (!tagsByItem[itemName]) tagsByItem[itemName] = [];
      tagsByItem[itemName].push(tag);
    });
  });
  return tagsByItem;
};

export const itemCategories = [
  'Building',
  'Resources',
  'Redstone & Automation',
  'Combat',
  'Food & Brewing',
  'Mob Drops',
  'Decoration & Collectibles',
  'Tools & Equipment',
  'Farming & Nature',
  'Transport & Storage',
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
        : {
            id: `minecraft:${name}`,
            name: displayNameFromId(name),
            category: 'Unclassified',
            subcategory: 'Needs review',
            stack: 64,
            maxDurability: null,
            tags: tagsByItem[name] || [],
          }),
    source: metadataFallbackVersion
      ? `mcmeta (metadata cross-checked with minecraft-data ${metadataFallbackVersion})`
      : 'mcmeta',
    unclassifiedCount: unclassifiedNames.length,
  };
};

export const fallbackMinecraftItems = fallbackItems.map((item) => normalizeItem(item));
