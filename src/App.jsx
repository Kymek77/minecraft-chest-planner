import { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { Trash2 } from 'lucide-react';
import {
  inventoryPresets,
} from './data/minecraftItems';
import {
  fetchMinecraftDataVersions,
  fetchMinecraftItems,
  fetchMojangReleaseVersions,
  fetchMinecraftVersions,
  fallbackMinecraftItems,
  nonSurvivalItemIds,
} from './data/minecraftData';

const CHEST_CAPACITY = {
  single: 27,
  double: 54,
};

const defaultStorageConfig = {
  totalChests: 600,
  chestsPerSection: 75,
  totalSections: 8,
};

const unassignedStorageGroup = { id: 'unassigned', label: 'Unassigned' };
const TEXTURE_VERSION = '1.21.4';
const MCASSET_ASSETS = 'https://assets.mcasset.cloud';
const modelTexturePromises = new Map();

const reservationColor = (id) => {
  const value = Array.from(id).reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 7);
  return `hsl(${value % 360} 62% 56%)`;
};

const fetchJsonAsset = (url) => {
  if (!modelTexturePromises.has(url)) {
    modelTexturePromises.set(url, fetch(url)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null));
  }
  return modelTexturePromises.get(url);
};

const resolveModelTexture = async (assetVersion, modelId, seen = new Set()) => {
  const modelPath = modelId.replace(/^minecraft:/, '');
  if (seen.has(modelPath)) return null;
  const model = await fetchJsonAsset(`${MCASSET_ASSETS}/${assetVersion}/assets/minecraft/models/${modelPath}.json`);
  if (!model) return null;

  const directTexture = Object.values(model.textures || {})
    .find((texture) => typeof texture === 'string' && !texture.startsWith('#'));
  if (directTexture) return directTexture.replace(/^minecraft:/, '');
  if (!model.parent) return null;

  return resolveModelTexture(assetVersion, model.parent, new Set(seen).add(modelPath));
};

const resolveItemModelTexture = async (assetVersion, itemName) => {
  const itemDefinition = await fetchJsonAsset(`${MCASSET_ASSETS}/${assetVersion}/assets/minecraft/items/${itemName}.json`);
  const modelId = itemDefinition?.model?.type === 'minecraft:model'
    ? itemDefinition.model.model
    : `minecraft:item/${itemName}`;
  return resolveModelTexture(assetVersion, modelId);
};

function MinecraftItemIcon({ item, assetVersion, className = '' }) {
  const [textureFolder, setTextureFolder] = useState('item');
  const [modelTexture, setModelTexture] = useState(null);
  const [missingTexture, setMissingTexture] = useState(false);
  const textureName = item?.id?.replace(/^minecraft:/, '') || 'barrier';

  useEffect(() => {
    setTextureFolder('item');
    setModelTexture(null);
    setMissingTexture(false);
  }, [assetVersion, item?.id]);

  if (missingTexture) {
    return <span className={`minecraft-item-icon missing ${className}`} aria-hidden="true" />;
  }

  return (
    <span className={`minecraft-item-icon ${className}`}>
      <img
        src={`${MCASSET_ASSETS}/${assetVersion || TEXTURE_VERSION}/assets/minecraft/textures/${modelTexture || `${textureFolder}/${textureName}`}.png`}
        alt=""
        loading="lazy"
        onError={async () => {
          if (modelTexture) setMissingTexture(true);
          else if (textureFolder === 'item') setTextureFolder('block');
          else if (textureFolder === 'block') {
            const resolvedTexture = await resolveItemModelTexture(assetVersion || TEXTURE_VERSION, textureName);
            if (resolvedTexture) setModelTexture(resolvedTexture);
            else setMissingTexture(true);
          } else setMissingTexture(true);
        }}
      />
    </span>
  );
}

function DraggableItemCard({ item, children }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `item:${item.id}` });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={isDragging ? 'dragging-item' : ''}>
      {children}
    </div>
  );
}

function ItemDropTarget({ id, className = '', children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} className={`${className}${isOver ? ' drag-over' : ''}`}>{children}</div>;
}

const makeIncludedItemMap = (items, selectedIds = items.map((item) => item.id)) => {
  const map = {};
  items.forEach((item) => {
    map[item.id] = selectedIds.includes(item.id);
  });
  return map;
};

function App() {
  const fileInputRef = useRef(null);
  const draggedItemIdRef = useRef(null);

  const [minecraftItems, setMinecraftItems] = useState(fallbackMinecraftItems);
  const [minecraftVersion, setMinecraftVersion] = useState(null);
  const [minecraftVersions, setMinecraftVersions] = useState([]);
  const [latestPublicVersion, setLatestPublicVersion] = useState(null);
  const [latestSupportedVersion, setLatestSupportedVersion] = useState(null);
  const [dataStatus, setDataStatus] = useState('Loading version data...');
  const [storageConfig, setStorageConfig] = useState(defaultStorageConfig);
  const [chestType, setChestType] = useState('double');
  const [selectedCategory, setSelectedCategory] = useState(unassignedStorageGroup.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('survival');
  const [itemScope, setItemScope] = useState('survival');
  const [itemOrder, setItemOrder] = useState('class');
  const [includedItems, setIncludedItems] = useState(() => makeIncludedItemMap(fallbackMinecraftItems));
  const [itemGroupOverrides, setItemGroupOverrides] = useState({});
  const [itemDedicatedChestOverrides, setItemDedicatedChestOverrides] = useState({});
  const [customStorageGroups, setCustomStorageGroups] = useState([]);
  const [customStoragePools, setCustomStoragePools] = useState([]);
  const [itemPoolOverrides, setItemPoolOverrides] = useState({});
  const [storageGroupChestOverrides, setStorageGroupChestOverrides] = useState({});
  const [reservationSectionOverrides, setReservationSectionOverrides] = useState({});
  const [draggedReservationId, setDraggedReservationId] = useState(null);
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [newStorageGroupName, setNewStorageGroupName] = useState('');
  const [newStoragePoolName, setNewStoragePoolName] = useState('');
  const dragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  useEffect(() => {
    let active = true;

    const loadMinecraftData = async () => {
      setDataStatus('Loading live Minecraft version data...');

      try {
        const [versions, publicReleaseInfo, minecraftDataVersions] = await Promise.all([
          fetchMinecraftVersions(),
          fetchMojangReleaseVersions(),
          fetchMinecraftDataVersions(),
        ]);

        if (!active) return;
        const supportedVersions = publicReleaseInfo.releases.filter((version) => versions.includes(version));
        const latestMinecraftDataVersion = publicReleaseInfo.releases.find((version) => minecraftDataVersions.includes(version));
        const latestSupported = publicReleaseInfo.releases.find((version) => versions.includes(version));
        setMinecraftVersions(supportedVersions);
        setLatestPublicVersion(publicReleaseInfo.latestRelease);
        setLatestSupportedVersion(latestSupported);

        if (!minecraftVersion && latestSupported) {
          setMinecraftVersion(latestSupported);
          return;
        }

        const selectedVersion = minecraftVersion || latestSupported;
        if (!selectedVersion) throw new Error('No supported Minecraft item source was found.');
        const { items, source, unclassifiedCount = 0 } = await fetchMinecraftItems(
          selectedVersion,
          selectedVersion === latestMinecraftDataVersion ? null : latestMinecraftDataVersion,
        );
        if (!active) return;
        setMinecraftItems(items);
        setIncludedItems(makeIncludedItemMap(items));
        setSelectedPreset('survival');
        const sourceLag = publicReleaseInfo.latestRelease !== latestSupported
          ? ` Public latest is ${publicReleaseInfo.latestRelease}; item data currently reaches ${latestSupported}.`
          : '';
        const metadataGapStatus = unclassifiedCount > 0
          ? ` ${unclassifiedCount} item${unclassifiedCount === 1 ? '' : 's'} are available only from mcmeta, without minecraft-data metadata.`
          : '';
        setDataStatus(`${items.length.toLocaleString()} items loaded from ${source}.${sourceLag}${metadataGapStatus}`);
      } catch (error) {
        if (!active) return;
        setDataStatus('Using the built-in catalog. Unable to reach minecraft-data.');
      }
    };

    loadMinecraftData();
    return () => {
      active = false;
    };
  }, [minecraftVersion]);

  const updateStorageConfig = (field, rawValue) => {
    const nextValue = Math.max(1, Number(rawValue) || 1);

    setStorageConfig((current) => {
      const source = { ...current };

      if (field === 'totalChests') {
        source.totalChests = nextValue;
        source.totalSections = Math.max(1, Math.round(source.totalChests / source.chestsPerSection));
        return source;
      }

      if (field === 'chestsPerSection') {
        source.chestsPerSection = nextValue;
        source.totalSections = Math.max(1, Math.round(source.totalChests / source.chestsPerSection));
        return source;
      }

      if (field === 'totalSections') {
        source.totalSections = nextValue;
        source.totalChests = Math.max(1, source.totalSections * source.chestsPerSection);
        return source;
      }

      return source;
    });
  };

  const chestSlotsPerChest = CHEST_CAPACITY[chestType];
  const storageGroups = useMemo(() => [unassignedStorageGroup, ...customStorageGroups], [customStorageGroups]);
  const storageGroupById = useMemo(
    () => Object.fromEntries(storageGroups.map((group) => [group.id, group])),
    [storageGroups],
  );

  const availableItems = useMemo(
    () => (itemScope === 'all'
      ? minecraftItems
      : minecraftItems.filter((item) => !nonSurvivalItemIds.has(item.id))),
    [itemScope, minecraftItems],
  );

  const itemStorageGroups = useMemo(
    () => Object.fromEntries(minecraftItems.map((item) => [
      item.id,
      itemGroupOverrides[item.id] || unassignedStorageGroup.id,
    ])),
    [itemGroupOverrides, minecraftItems],
  );

  const storagePools = useMemo(
    () => customStoragePools,
    [customStoragePools],
  );

  const storagePoolById = useMemo(
    () => Object.fromEntries(storagePools.map((pool) => [pool.id, pool])),
    [storagePools],
  );

  const itemStoragePools = useMemo(
    () => Object.fromEntries(minecraftItems.map((item) => {
      const groupId = itemStorageGroups[item.id];
      const overriddenPool = storagePoolById[itemPoolOverrides[item.id]];
      return [item.id, overriddenPool?.groupId === groupId ? overriddenPool.id : null];
    })),
    [itemGroupOverrides, itemPoolOverrides, minecraftItems, storagePoolById, itemStorageGroups],
  );

  const orderedAvailableItems = useMemo(() => {
    const sorted = availableItems.slice();
    if (itemOrder === 'alphabetical') {
      return sorted.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    }

    return sorted.sort((a, b) =>
      (storageGroups.findIndex((group) => group.id === itemStorageGroups[a.id]) - storageGroups.findIndex((group) => group.id === itemStorageGroups[b.id])) ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id),
    );
  }, [availableItems, itemOrder, itemStorageGroups]);

  const selectedItems = useMemo(
    () => orderedAvailableItems.filter((item) => includedItems[item.id]),
    [orderedAvailableItems, includedItems],
  );

  const storagePlanByGroupId = useMemo(
    () => Object.fromEntries(storageGroups.map((group) => {
      const items = selectedItems.filter((item) => itemStorageGroups[item.id] === group.id);
      const dedicatedItems = items
        .map((item) => ({
          item,
          chestCount: itemStoragePools[item.id]
            ? 0
            : itemDedicatedChestOverrides[item.id] === undefined
              ? 1
              : Math.max(0, Number(itemDedicatedChestOverrides[item.id]) || 0),
        }))
        .filter(({ chestCount }) => chestCount > 0);
      const sharedItems = items.filter((item) => itemStoragePools[item.id]);
      const pools = storagePools
        .filter((pool) => pool.groupId === group.id)
        .map((pool) => {
          const poolItems = sharedItems.filter((item) => itemStoragePools[item.id] === pool.id);
          const minimumChests = Math.ceil(poolItems.length / chestSlotsPerChest);
          const requestedChests = storageGroupChestOverrides[pool.id];
          return {
            ...pool,
            items: poolItems,
            minimumChests,
            chestCount: requestedChests === undefined
              ? minimumChests
              : Math.max(minimumChests, Number(requestedChests) || 0),
          };
        });

      return [group.id, {
        ...group,
        items,
        sharedItems,
        dedicatedItems,
        pools,
        dedicatedChests: dedicatedItems.reduce((total, entry) => total + entry.chestCount, 0),
      }];
    })),
    [chestSlotsPerChest, itemDedicatedChestOverrides, itemStorageGroups, itemStoragePools, selectedItems, storageGroupChestOverrides, storageGroups, storagePools],
  );

  const storagePlanEntries = useMemo(
    () => storageGroups.flatMap((group) => {
      const groupPlan = storagePlanByGroupId[group.id];
      const sharedEntries = groupPlan.pools
        .filter((pool) => pool.chestCount > 0)
        .map((pool) => ({
          id: pool.id,
          label: `${group.label}: ${pool.label}`,
          chestCount: pool.chestCount,
          itemPreview: pool.items.slice(0, 3).map((item) => item.name),
          iconItem: pool.items[0],
        }));
      const dedicatedEntries = groupPlan.dedicatedItems.map(({ item, chestCount }) => ({
        id: `${group.id}-${item.id}`,
        label: item.name,
        chestCount,
        itemPreview: [item.name],
        iconItem: item,
      }));

      return [...dedicatedEntries, ...sharedEntries];
    }),
    [storageGroups, storagePlanByGroupId],
  );

  const reservedChests = useMemo(
    () => storagePlanEntries.reduce((total, entry) => total + entry.chestCount, 0),
    [storagePlanEntries],
  );

  const categoryGroups = useMemo(() => {
    const groups = {};

    selectedItems.forEach((item) => {
      const groupId = itemStorageGroups[item.id];
      if (!groups[groupId]) {
        groups[groupId] = {
          category: storageGroupById[groupId]?.label || unassignedStorageGroup.label,
          groupId,
          itemCount: 0,
          items: [],
        };
      }

      groups[groupId].itemCount += 1;
      groups[groupId].items.push(item);
    });

    return Object.fromEntries(
      Object.entries(groups).sort(([, a], [, b]) => b.itemCount - a.itemCount),
    );
  }, [itemStorageGroups, selectedItems]);

  const sections = useMemo(() => {
    const generated = [];
    let remainingChests = storageConfig.totalChests;
    let index = 1;

    while (remainingChests > 0) {
      const chestCount = Math.min(storageConfig.chestsPerSection, remainingChests);
      generated.push({
        id: index,
        chestCount,
        slotCapacity: chestCount * chestSlotsPerChest,
      });
      remainingChests -= chestCount;
      index += 1;
    }

    return generated;
  }, [storageConfig, chestSlotsPerChest]);

  const sectionPlans = useMemo(() => {
    const remainingByReservation = Object.fromEntries(
      storagePlanEntries.map((entry) => [entry.id, entry.chestCount]),
    );

    const allocations = sections.map((section) => ({
      ...section,
      categories: [],
      remainingChests: section.chestCount,
    }));

    const placeReservation = (entry, startIndex) => {
      for (let sectionIndex = startIndex; sectionIndex < allocations.length; sectionIndex += 1) {
        const section = allocations[sectionIndex];
        if (section.remainingChests <= 0 || (remainingByReservation[entry.id] ?? 0) <= 0) continue;

        const allocated = Math.min(remainingByReservation[entry.id], section.remainingChests);
        section.categories.push({
          reservationId: entry.id,
          category: entry.label,
          usedChests: allocated,
          itemPreview: entry.itemPreview,
          iconItem: entry.iconItem,
          color: reservationColor(entry.id),
        });
        remainingByReservation[entry.id] -= allocated;
        section.remainingChests -= allocated;
      }
    };

    const sectionIndexById = Object.fromEntries(sections.map((section, index) => [section.id, index]));
    const pinnedReservations = storagePlanEntries
      .filter((entry) => sectionIndexById[reservationSectionOverrides[entry.id]] !== undefined)
      .sort((left, right) =>
        sectionIndexById[reservationSectionOverrides[left.id]] - sectionIndexById[reservationSectionOverrides[right.id]],
      );
    const automaticReservations = storagePlanEntries.filter((entry) => !pinnedReservations.includes(entry));

    pinnedReservations.forEach((entry) => placeReservation(entry, sectionIndexById[reservationSectionOverrides[entry.id]]));
    automaticReservations.forEach((entry) => placeReservation(entry, 0));

    return allocations;
  }, [reservationSectionOverrides, sections, storagePlanEntries]);

  const unallocatedReservations = useMemo(() => {
    const allocatedById = {};
    sectionPlans.forEach((section) => {
      section.categories.forEach((category) => {
        allocatedById[category.reservationId] = (allocatedById[category.reservationId] || 0) + category.usedChests;
      });
    });

    return storagePlanEntries
      .map((entry) => ({ ...entry, chestCount: entry.chestCount - (allocatedById[entry.id] || 0) }))
      .filter((entry) => entry.chestCount > 0);
  }, [sectionPlans, storagePlanEntries]);

  const overallStats = useMemo(() => {
    const itemTypeCount = selectedItems.length;
    const categoryCount = Object.keys(categoryGroups).length;
    const fillRate = storageConfig.totalChests > 0 ? (reservedChests / storageConfig.totalChests) * 100 : 0;

    return {
      itemTypeCount,
      categoryCount,
      fillRate,
      reservedChests,
      availableChests: storageConfig.totalChests - reservedChests,
      totalSections: sections.length,
    };
  }, [categoryGroups, reservedChests, sections, selectedItems, storageConfig.totalChests]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return orderedAvailableItems.filter((item) => {
      const groupMatch = itemStorageGroups[item.id] === selectedCategory;
      const queryMatch =
        normalizedQuery.length === 0 ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.id.toLowerCase().includes(normalizedQuery) ||
        item.enchantCategories.some((category) => category.includes(normalizedQuery));

      return groupMatch && queryMatch;
    });
  }, [itemStorageGroups, orderedAvailableItems, searchQuery, selectedCategory]);

  const categorySummary = useMemo(
    () =>
      Object.entries(categoryGroups).map(([, data]) => ({
        category: data.category,
        items: data.itemCount,
      })),
    [categoryGroups],
  );

  const priorityItems = useMemo(
    () =>
      selectedItems
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 8),
    [selectedItems],
  );

  const toggleItemIncluded = (itemId) => {
    setIncludedItems((current) => ({
      ...current,
      [itemId]: !current[itemId],
    }));
  };

  const setItemStorageGroup = (itemId, groupId) => {
    setItemGroupOverrides((current) => ({ ...current, [itemId]: groupId }));
    setItemPoolOverrides((current) => ({ ...current, [itemId]: undefined }));
    setItemDedicatedChestOverrides((current) => ({ ...current, [itemId]: undefined }));
  };

  const setItemStoragePool = (itemId, poolId) => {
    const pool = storagePoolById[poolId];
    if (!pool) return;
    setItemGroupOverrides((current) => ({ ...current, [itemId]: pool.groupId }));
    setItemPoolOverrides((current) => ({ ...current, [itemId]: poolId }));
    setItemDedicatedChestOverrides((current) => ({ ...current, [itemId]: 0 }));
  };

  const setItemDedicatedChests = (itemId, rawValue) => {
    const chestCount = Math.max(0, Math.floor(Number(rawValue) || 0));
    setItemDedicatedChestOverrides((current) => ({ ...current, [itemId]: chestCount }));
  };

  const setSharedPoolChests = (poolId, rawValue) => {
    const minimum = Object.values(storagePlanByGroupId)
      .flatMap((groupPlan) => groupPlan.pools)
      .find((pool) => pool.id === poolId)?.minimumChests || 0;
    const chestCount = Math.max(minimum, Math.floor(Number(rawValue) || 0));
    setStorageGroupChestOverrides((current) => ({ ...current, [poolId]: chestCount }));
  };

  const moveReservationToSection = (reservationId, sectionId) => {
    setReservationSectionOverrides((current) => ({
      ...current,
      [reservationId]: sectionId ? Number(sectionId) : undefined,
    }));
  };

  const addStorageGroup = () => {
    const label = newStorageGroupName.trim();
    if (!label) return;
    const id = `group-${crypto.randomUUID()}`;
    setCustomStorageGroups((current) => [...current, { id, label }]);
    setNewStorageGroupName('');
    setSelectedCategory(id);
  };

  const addStoragePool = () => {
    const label = newStoragePoolName.trim();
    if (!label) return;
    const id = `pool-${crypto.randomUUID()}`;
    setCustomStoragePools((current) => [...current, { id, groupId: selectedCategory, label }]);
    setNewStoragePoolName('');
  };

  const deleteStoragePool = (poolId) => {
    setCustomStoragePools((current) => current.filter((pool) => pool.id !== poolId));
    setItemPoolOverrides((current) => {
      const next = { ...current };
      Object.entries(next).forEach(([itemId, assignedPoolId]) => {
        if (assignedPoolId === poolId) delete next[itemId];
      });
      return next;
    });
    setItemDedicatedChestOverrides((current) => {
      const next = { ...current };
      Object.entries(itemPoolOverrides).forEach(([itemId, assignedPoolId]) => {
        if (assignedPoolId === poolId) delete next[itemId];
      });
      return next;
    });
    setStorageGroupChestOverrides((current) => {
      const next = { ...current };
      delete next[poolId];
      return next;
    });
    setReservationSectionOverrides((current) => {
      const next = { ...current };
      delete next[poolId];
      return next;
    });
  };

  const deleteStorageGroup = (groupId) => {
    if (groupId === unassignedStorageGroup.id) return;
    const deletedPoolIds = new Set(customStoragePools.filter((pool) => pool.groupId === groupId).map((pool) => pool.id));
    deletedPoolIds.add(`${groupId}-shared`);
    setCustomStorageGroups((current) => current.filter((group) => group.id !== groupId));
    setCustomStoragePools((current) => current.filter((pool) => pool.groupId !== groupId));
    setItemGroupOverrides((current) => Object.fromEntries(
      Object.entries(current).filter(([, assignedGroupId]) => assignedGroupId !== groupId),
    ));
    setItemPoolOverrides((current) => Object.fromEntries(
      Object.entries(current).filter(([, poolId]) => !deletedPoolIds.has(poolId)),
    ));
    setStorageGroupChestOverrides((current) => Object.fromEntries(
      Object.entries(current).filter(([poolId]) => !deletedPoolIds.has(poolId)),
    ));
    setReservationSectionOverrides((current) => Object.fromEntries(
      Object.entries(current).filter(([reservationId]) => !deletedPoolIds.has(reservationId) && !reservationId.startsWith(`${groupId}-`)),
    ));
    if (selectedCategory === groupId) setSelectedCategory(unassignedStorageGroup.id);
  };

  const applyPreset = (presetKey) => {
    const preset = inventoryPresets[presetKey];
    if (!preset) return;

    setSelectedPreset(presetKey);
    setIncludedItems(makeIncludedItemMap(minecraftItems, preset.itemIds));
  };

  const resetToDefault = () => {
    setSelectedPreset('survival');
    setItemScope('survival');
    setIncludedItems(makeIncludedItemMap(minecraftItems));
    setItemGroupOverrides({});
    setItemDedicatedChestOverrides({});
    setCustomStorageGroups([]);
    setCustomStoragePools([]);
    setItemPoolOverrides({});
    setStorageGroupChestOverrides({});
    setReservationSectionOverrides({});
    setSelectedCategory(unassignedStorageGroup.id);
  };

  const exportPlan = () => {
    const payload = {
      totalChests: storageConfig.totalChests,
      chestsPerSection: storageConfig.chestsPerSection,
      totalSections: storageConfig.totalSections,
      chestType,
      itemScope,
      includedItems: Object.entries(includedItems)
        .filter(([, selected]) => selected)
        .map(([itemId]) => itemId),
      itemGroupOverrides,
      itemDedicatedChestOverrides,
      customStorageGroups,
      customStoragePools,
      itemPoolOverrides,
      storageGroupChestOverrides,
      reservationSectionOverrides,
      generatedAt: new Date().toISOString(),
      sections: sectionPlans,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'minecraft-chest-plan.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importPlan = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));

        if (Array.isArray(parsed.includedItems)) {
          setIncludedItems(makeIncludedItemMap(minecraftItems, parsed.includedItems));
        }

        const importedGroups = Array.isArray(parsed.customStorageGroups)
          ? parsed.customStorageGroups.filter((group) => typeof group?.id === 'string' && typeof group?.label === 'string')
          : [];
        const importedGroupIds = new Set([unassignedStorageGroup.id, ...importedGroups.map((group) => group.id)]);

        if (parsed.itemGroupOverrides && typeof parsed.itemGroupOverrides === 'object') {
          setItemGroupOverrides(
            Object.fromEntries(
              Object.entries(parsed.itemGroupOverrides).filter(([, groupId]) => importedGroupIds.has(groupId)),
            ),
          );
        }

        setCustomStorageGroups(importedGroups);

        const importedPools = Array.isArray(parsed.customStoragePools)
          ? parsed.customStoragePools.filter((pool) =>
            typeof pool?.id === 'string' &&
            typeof pool?.groupId === 'string' &&
            importedGroupIds.has(pool.groupId) &&
            typeof pool?.label === 'string')
          : [];
        const importedPoolIds = new Set([
          ...Array.from(importedGroupIds).map((groupId) => `${groupId}-shared`),
          ...importedPools.map((pool) => pool.id),
        ]);
        setCustomStoragePools(importedPools);

        if (parsed.itemPoolOverrides && typeof parsed.itemPoolOverrides === 'object') {
          setItemPoolOverrides(
            Object.fromEntries(
              Object.entries(parsed.itemPoolOverrides)
                .filter(([itemId, poolId]) => minecraftItems.some((item) => item.id === itemId) && importedPoolIds.has(poolId)),
            ),
          );
        }

        if (parsed.itemDedicatedChestOverrides && typeof parsed.itemDedicatedChestOverrides === 'object') {
          setItemDedicatedChestOverrides(
            Object.fromEntries(
              Object.entries(parsed.itemDedicatedChestOverrides)
                .filter(([itemId, chestCount]) => minecraftItems.some((item) => item.id === itemId) && Number(chestCount) >= 0)
                .map(([itemId, chestCount]) => [itemId, Math.floor(Number(chestCount))]),
            ),
          );
        }

        if (parsed.storageGroupChestOverrides && typeof parsed.storageGroupChestOverrides === 'object') {
          setStorageGroupChestOverrides(
            Object.fromEntries(
              Object.entries(parsed.storageGroupChestOverrides)
                .filter(([poolId, chestCount]) => (importedPoolIds.has(poolId) || importedGroupIds.has(poolId)) && Number(chestCount) >= 0)
                .map(([poolId, chestCount]) => [importedGroupIds.has(poolId) ? `${poolId}-shared` : poolId, Math.floor(Number(chestCount))]),
            ),
          );
        }

        if (parsed.reservationSectionOverrides && typeof parsed.reservationSectionOverrides === 'object') {
          setReservationSectionOverrides(
            Object.fromEntries(
              Object.entries(parsed.reservationSectionOverrides)
                .filter(([, sectionId]) => Number.isInteger(Number(sectionId)) && Number(sectionId) > 0)
                .map(([reservationId, sectionId]) => [reservationId, Number(sectionId)]),
            ),
          );
        }

        if (parsed.totalChests || parsed.chestsPerSection || parsed.totalSections) {
          const nextConfig = {
            totalChests: Number(parsed.totalChests) || defaultStorageConfig.totalChests,
            chestsPerSection: Number(parsed.chestsPerSection) || defaultStorageConfig.chestsPerSection,
            totalSections: Number(parsed.totalSections) || defaultStorageConfig.totalSections,
          };

          setStorageConfig(nextConfig);
        }

        if (parsed.chestType) {
          setChestType(parsed.chestType === 'single' ? 'single' : 'double');
        }

        if (parsed.itemScope) {
          setItemScope(parsed.itemScope === 'all' ? 'all' : 'survival');
        }
      } catch (error) {
        window.alert('Unable to import the selected file. Please choose a valid JSON export.');
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const handleItemDragEnd = ({ active, over }) => {
    if (!over || !String(active.id).startsWith('item:')) return;
    const itemId = String(active.id).replace(/^item:/, '');
    const targetId = String(over.id);
    if (targetId.startsWith('group:')) setItemStorageGroup(itemId, targetId.replace(/^group:/, ''));
    if (targetId.startsWith('pool:')) setItemStoragePool(itemId, targetId.replace(/^pool:/, ''));
  };

  return (
    <DndContext sensors={dragSensors} onDragEnd={handleItemDragEnd}>
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ChestCraft Planner</p>
          <h1>Advanced Minecraft Chest Organizer</h1>
        </div>
        <div className="header-badge">MC 1.21+ / section-based planner</div>
      </header>

      <main className="workspace-grid">
        <aside className="panel sidebar-panel">
          <h2>Storage setup</h2>

          <label>
            Minecraft version
            <select value={minecraftVersion || ''} onChange={(event) => setMinecraftVersion(event.target.value)}>
              {minecraftVersions.map((version) => (
                <option
                  key={version}
                  value={version}
                  disabled={version === latestPublicVersion && version !== latestSupportedVersion}
                >
                  {version}{version === latestPublicVersion && version !== latestSupportedVersion ? ' (data pending)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Item ordering
            <select value={itemOrder} onChange={(event) => setItemOrder(event.target.value)}>
              <option value="class">Storage group, then name</option>
              <option value="alphabetical">Alphabetical only</option>
            </select>
          </label>
          <p className="data-status" role="status">{dataStatus}</p>

          <div className="field-grid">
            <label>
              Total chests
              <input
                type="number"
                min="1"
                value={storageConfig.totalChests}
                onChange={(event) => updateStorageConfig('totalChests', event.target.value)}
              />
            </label>

            <label>
              Chest size
              <select value={chestType} onChange={(event) => setChestType(event.target.value)}>
                <option value="single">Single chest (27 slots)</option>
                <option value="double">Double chest (54 slots)</option>
              </select>
            </label>
          </div>

          <div className="field-grid">
            <label>
              Chests per section
              <input
                type="number"
                min="1"
                value={storageConfig.chestsPerSection}
                onChange={(event) => updateStorageConfig('chestsPerSection', event.target.value)}
              />
            </label>

            <label>
              Total sections
              <input
                type="number"
                min="1"
                value={storageConfig.totalSections}
                onChange={(event) => updateStorageConfig('totalSections', event.target.value)}
              />
            </label>
          </div>

          <div className="section-badges">
            {sections.map((section) => (
              <div className="section-badge" key={section.id}>
                <span>Section {section.id}</span>
                <strong>{section.chestCount} chests</strong>
              </div>
            ))}
          </div>

          <div className="preset-block">
            <h3>Presets</h3>
            <div className="preset-list">
              {Object.entries(inventoryPresets).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  className={selectedPreset === key ? 'preset selected' : 'preset'}
                  onClick={() => applyPreset(key)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="scope-block">
            <div>
              <h3>Survival view</h3>
              <p className="helper-text">Curated filter for known command and debug-only registry entries.</p>
            </div>
            <label className="switch-row">
              <span>All items</span>
              <input
                type="checkbox"
                role="switch"
                checked={itemScope === 'all'}
                onChange={(event) => setItemScope(event.target.checked ? 'all' : 'survival')}
              />
              <span className="switch-track" aria-hidden="true"><span /></span>
            </label>
            <small className="scope-status">
              {itemScope === 'all' ? 'Includes all registry entries.' : 'Curated survival view.'}
            </small>
          </div>

          <div className="import-export">
            <button type="button" className="primary-button" onClick={exportPlan}>Export JSON</button>
            <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>
              Import JSON
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={importPlan} />
          </div>
        </aside>

        <section className="panel main-panel">
          <div className="toolbar">
            <div className="category-tabs">
              {storageGroups.map((group) => (
                <ItemDropTarget key={group.id} id={`group:${group.id}`} className="group-tab-target">
                  <button
                    type="button"
                    className={selectedCategory === group.id ? 'tab active' : 'tab'}
                    onClick={() => setSelectedCategory(group.id)}
                  >
                    {group.label}
                  </button>
                  {group.id !== unassignedStorageGroup.id && (
                    <button
                      type="button"
                      className="delete-control"
                      aria-label={`Delete ${group.label} group`}
                      title={`Delete ${group.label} group`}
                      onClick={() => deleteStorageGroup(group.id)}
                    >
                      <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
                    </button>
                  )}
                </ItemDropTarget>
              ))}
            </div>

            <div className="search-box">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search items or ID"
              />
            </div>
          </div>

          <div className="group-creator">
            <label>
              New storage group
              <input value={newStorageGroupName} onChange={(event) => setNewStorageGroupName(event.target.value)} placeholder="e.g. Mob drops" />
            </label>
            <button type="button" className="secondary-button" onClick={addStorageGroup}>Add group</button>
          </div>

          <div className="pool-manager">
            <div className="pool-manager-header">
              <div>
                <h3>Chest pools for {storagePlanByGroupId[selectedCategory]?.label}</h3>
                <p className="helper-text">Drop items into a pool to share its reserved chests.</p>
              </div>
              <label>
                New pool
                <input value={newStoragePoolName} onChange={(event) => setNewStoragePoolName(event.target.value)} placeholder="e.g. Acacia shapes" />
              </label>
              <button type="button" className="secondary-button" onClick={addStoragePool}>Add pool</button>
            </div>
            <div className="pool-list">
              {storagePlanByGroupId[selectedCategory]?.pools.map((pool) => (
                <ItemDropTarget key={pool.id} id={`pool:${pool.id}`} className="pool-drop-target">
                  <div>
                    <strong>{pool.label}</strong>
                    <small>{pool.items.length} item types; minimum {pool.minimumChests} chest{pool.minimumChests === 1 ? '' : 's'}.</small>
                  </div>
                  <label>
                    Chests
                    <input
                      type="number"
                      min={pool.minimumChests}
                      value={pool.chestCount}
                      onChange={(event) => setSharedPoolChests(pool.id, event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="delete-control"
                    aria-label={`Delete ${pool.label} pool`}
                    title={`Delete ${pool.label} pool`}
                    onClick={() => deleteStoragePool(pool.id)}
                  >
                    <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
                  </button>
                </ItemDropTarget>
              ))}
            </div>
          </div>

          {overallStats.availableChests < 0 && (
            <p className="capacity-warning" role="alert">
              Reservations exceed the configured storage by {Math.abs(overallStats.availableChests)} chest{Math.abs(overallStats.availableChests) === 1 ? '' : 's'}.
            </p>
          )}

          <div className="inventory-grid">
            {filteredItems.map((item) => {
              const checked = !!includedItems[item.id];
              return (
                <DraggableItemCard key={item.id} item={item}>
                <div className={checked ? 'inventory-card selected' : 'inventory-card'}>
                  <div className="inventory-card-header">
                    <div className="item-title">
                      <MinecraftItemIcon item={item} assetVersion={minecraftVersion || TEXTURE_VERSION} />
                      <strong>{item.name}</strong>
                    </div>
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItemIncluded(item.id)}
                      />
                      <span>Include</span>
                    </label>
                  </div>

                  <div className="inventory-card-meta">
                    <small>Store in: {storageGroupById[itemStorageGroups[item.id]].label}</small>
                    <small>Source: {item.source}</small>
                    {item.enchantCategories.length > 0 && <small>Enchantment categories: {item.enchantCategories.join(', ')}</small>}
                  </div>
                  <label className="item-group-control">
                    Store in
                    <select value={itemStorageGroups[item.id]} onChange={(event) => setItemStorageGroup(item.id, event.target.value)}>
                      {storageGroups.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
                    </select>
                  </label>
                  <label className="item-group-control">
                    Dedicated chests
                    <input
                      type="number"
                      min="0"
                      value={itemStoragePools[item.id] ? 0 : itemDedicatedChestOverrides[item.id] ?? 1}
                      onChange={(event) => setItemDedicatedChests(item.id, event.target.value)}
                    />
                    <small>{itemStoragePools[item.id] ? 'Uses a custom chest pool' : 'Reserved for this item only'}</small>
                  </label>
                </div>
                </DraggableItemCard>
              );
            })}
          </div>

          <div className="footer-actions">
            <button type="button" className="ghost-button" onClick={resetToDefault}>Reset to survival defaults</button>
          </div>
        </section>

        <aside className="panel summary-panel">
          <h2>Storage summary</h2>

          <div className="stat-grid">
            <div className="stat-card">
              <span>Item types</span>
              <strong>{overallStats.itemTypeCount.toLocaleString()}</strong>
            </div>
            <div className="stat-card">
              <span>Storage groups</span>
              <strong>{overallStats.categoryCount.toLocaleString()}</strong>
            </div>
            <div className="stat-card">
              <span>Reserved chests</span>
              <strong>{overallStats.reservedChests.toLocaleString()} / {storageConfig.totalChests.toLocaleString()}</strong>
            </div>
            <div className="stat-card">
              <span>Reserved capacity</span>
              <strong>{overallStats.fillRate.toFixed(1)}%</strong>
            </div>
            <div className="stat-card">
              <span>Available chests</span>
              <strong>{overallStats.availableChests.toLocaleString()}</strong>
            </div>
          </div>

          <div className="summary-block">
            <h3>Storage groups</h3>
            <div className="category-summary-list">
              {categorySummary.map(({ category, items }) => (
                <div key={category} className="summary-row">
                  <span>{category}</span>
                  <strong>{items.toLocaleString()} types</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="summary-block">
            <h3>Priority types</h3>
            <div className="priority-list">
              {priorityItems.map((item) => (
                <div key={item.id} className="priority-row">
                  <MinecraftItemIcon item={item} assetVersion={minecraftVersion || TEXTURE_VERSION} />
                  <div>
                    <strong>{item.name}</strong>
                    <small>{storageGroupById[itemStorageGroups[item.id]].label}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      <section className="panel allocation-panel">
        <div className="allocation-header">
          <div>
            <h2>Chest layout</h2>
            <p>Drag a reservation onto a section to place it. Each tile represents one chest.</p>
          </div>
          <p>
            {storageConfig.totalChests} chests • {chestType} chest type • {storageConfig.chestsPerSection} chests/section • {storageConfig.totalSections} sections
          </p>
        </div>

        <div className="layout-workspace">
          <aside className="reservation-rail" aria-label="Chest reservations">
            <div className="reservation-rail-header">
              <h3>Reservations</h3>
              <span>{reservedChests} chests</span>
            </div>
            <div className="reservation-list">
              {storagePlanEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="reservation-card"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', entry.id);
                    event.dataTransfer.effectAllowed = 'move';
                    setDraggedReservationId(entry.id);
                  }}
                  onDragEnd={() => setDraggedReservationId(null)}
                >
                  <span className="reservation-swatch" style={{ backgroundColor: reservationColor(entry.id) }} />
                  <div className="reservation-card-copy">
                    <div className="item-title">
                      <MinecraftItemIcon item={entry.iconItem} assetVersion={minecraftVersion || TEXTURE_VERSION} />
                      <strong>{entry.label}</strong>
                    </div>
                    <small>{entry.chestCount} chest{entry.chestCount === 1 ? '' : 's'} • {entry.itemPreview.join(', ')}</small>
                  </div>
                  <label>
                    Section
                    <select
                      value={reservationSectionOverrides[entry.id] || ''}
                      onChange={(event) => moveReservationToSection(entry.id, event.target.value)}
                    >
                      <option value="">Auto</option>
                      {sections.map((section) => <option key={section.id} value={section.id}>Section {section.id}</option>)}
                    </select>
                  </label>
                </div>
              ))}
            </div>

            {unallocatedReservations.length > 0 && (
              <div className="unallocated-reservations">
                <h3>Needs space</h3>
                {unallocatedReservations.map((entry) => (
                  <p key={entry.id}>{entry.label}: {entry.chestCount} chest{entry.chestCount === 1 ? '' : 's'}</p>
                ))}
              </div>
            )}
          </aside>

          <div className="allocation-grid">
            {sectionPlans.map((section) => (
              <div
                key={section.id}
                className="allocation-card section-drop-zone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const reservationId = event.dataTransfer.getData('text/plain') || draggedReservationId;
                  if (reservationId) moveReservationToSection(reservationId, section.id);
                  setDraggedReservationId(null);
                }}
              >
                <div className="allocation-card-header">
                  <h3>Section {section.id}</h3>
                  <span>{section.chestCount} chests</span>
                </div>

                <div className="chest-grid" aria-label={`Section ${section.id} chest map`}>
                  {section.categories.flatMap((category) => Array.from({ length: category.usedChests }, (_, index) => (
                    <button
                      key={`${section.id}-${category.reservationId}-${index}`}
                      type="button"
                      className="chest-cell assigned"
                      title={`${category.category}: chest ${index + 1}`}
                      aria-label={`${category.category}, chest ${index + 1}`}
                      style={{ '--reservation-color': category.color }}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/plain', category.reservationId);
                        event.dataTransfer.effectAllowed = 'move';
                        setDraggedReservationId(category.reservationId);
                      }}
                      onDragEnd={() => setDraggedReservationId(null)}
                    />
                  )))}
                  {Array.from({ length: section.remainingChests }, (_, index) => (
                    <div key={`empty-${section.id}-${index}`} className="chest-cell empty" aria-label="Unreserved chest" />
                  ))}
                </div>

                <div className="section-legend">
                  {section.categories.map((category) => (
                    <span key={`${section.id}-${category.reservationId}`}>
                      <i style={{ backgroundColor: category.color }} />
                      <MinecraftItemIcon item={category.iconItem} assetVersion={minecraftVersion || TEXTURE_VERSION} className="legend-icon" />
                      {category.category} ({category.usedChests})
                    </span>
                  ))}
                  {section.remainingChests > 0 && <span className="legend-empty">{section.remainingChests} unreserved</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
    </DndContext>
  );
}

export default App;
