import { useEffect, useMemo, useRef, useState } from 'react';
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

const storageGroups = [
  { id: 'building', label: 'Building blocks', tags: ['stairs', 'slabs', 'walls', 'fences', 'doors', 'trapdoors', 'buttons', 'pressure_plates', 'terracotta', 'concrete', 'wool'] },
  { id: 'wood', label: 'Wood and plants', tags: ['logs', 'planks', 'saplings', 'leaves'] },
  { id: 'resources', label: 'Resources and ores', tags: ['ores', 'coal_ores', 'iron_ores', 'gold_ores', 'copper_ores', 'diamond_ores', 'emerald_ores', 'lapis_ores', 'redstone_ores'] },
  { id: 'redstone', label: 'Redstone and automation', tags: ['rails'] },
  { id: 'tools', label: 'Tools and combat', tags: ['axes', 'pickaxes', 'shovels', 'hoes', 'swords', 'spears', 'bows', 'crossbows', 'head_armor', 'chest_armor', 'leg_armor', 'foot_armor'] },
  { id: 'food', label: 'Food and farming', tags: ['meat', 'fishes', 'flowers', 'small_flowers', 'crops', 'villager_plantable_seeds'] },
  { id: 'transport', label: 'Transport and storage', tags: ['boats', 'chest_boats', 'shulker_boxes'] },
  { id: 'decor', label: 'Decor and collectibles', tags: ['dyes', 'banners', 'candles', 'lanterns', 'skulls'] },
  { id: 'mob', label: 'Mob drops', tags: [] },
  { id: 'utility', label: 'Utility and brewing', tags: [] },
  { id: 'misc', label: 'Miscellaneous', tags: [] },
];

const storageGroupById = Object.fromEntries(storageGroups.map((group) => [group.id, group]));

const getDefaultStorageGroup = (item) => {
  const tags = new Set(item.tags || []);
  const matchingGroup = storageGroups.find((group) => group.tags.some((tag) => tags.has(tag)));
  if (matchingGroup) return matchingGroup.id;

  const categoryMap = {
    Building: 'building',
    Resources: 'resources',
    'Redstone & Automation': 'redstone',
    Combat: 'tools',
    'Tools & Equipment': 'tools',
    'Food & Brewing': 'food',
    'Farming & Nature': 'food',
    'Transport & Storage': 'transport',
    'Decoration & Collectibles': 'decor',
    'Mob Drops': 'mob',
    Technical: 'misc',
  };
  return categoryMap[item.category] || 'utility';
};

const makeIncludedItemMap = (items, selectedIds = items.map((item) => item.id)) => {
  const map = {};
  items.forEach((item) => {
    map[item.id] = selectedIds.includes(item.id);
  });
  return map;
};

function App() {
  const fileInputRef = useRef(null);

  const [minecraftItems, setMinecraftItems] = useState(fallbackMinecraftItems);
  const [minecraftVersion, setMinecraftVersion] = useState(null);
  const [minecraftVersions, setMinecraftVersions] = useState([]);
  const [latestPublicVersion, setLatestPublicVersion] = useState(null);
  const [latestSupportedVersion, setLatestSupportedVersion] = useState(null);
  const [dataStatus, setDataStatus] = useState('Loading version data...');
  const [storageConfig, setStorageConfig] = useState(defaultStorageConfig);
  const [chestType, setChestType] = useState('double');
  const [selectedCategory, setSelectedCategory] = useState('building');
  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  const [selectedForm, setSelectedForm] = useState('All');
  const [selectedTag, setSelectedTag] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('survival');
  const [itemScope, setItemScope] = useState('survival');
  const [itemOrder, setItemOrder] = useState('class');
  const [includedItems, setIncludedItems] = useState(() => makeIncludedItemMap(fallbackMinecraftItems));
  const [itemGroupOverrides, setItemGroupOverrides] = useState({});

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
        const unclassifiedStatus = unclassifiedCount > 0
          ? ` ${unclassifiedCount} item${unclassifiedCount === 1 ? '' : 's'} need class review for this version.`
          : '';
        setDataStatus(`${items.length.toLocaleString()} items loaded from ${source}.${sourceLag}${unclassifiedStatus}`);
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
  const totalSlots = storageConfig.totalChests * chestSlotsPerChest;

  const availableItems = useMemo(
    () =>
      itemScope === 'all'
        ? minecraftItems
        : minecraftItems.filter((item) => !nonSurvivalItemIds.has(item.id)),
    [itemScope, minecraftItems],
  );

  const itemStorageGroups = useMemo(
    () => Object.fromEntries(minecraftItems.map((item) => [
      item.id,
      itemGroupOverrides[item.id] || getDefaultStorageGroup(item),
    ])),
    [itemGroupOverrides, minecraftItems],
  );

  const orderedAvailableItems = useMemo(() => {
    const sorted = availableItems.slice();
    if (itemOrder === 'alphabetical') {
      return sorted.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    }

    return sorted.sort((a, b) =>
      (storageGroups.findIndex((group) => group.id === itemStorageGroups[a.id]) - storageGroups.findIndex((group) => group.id === itemStorageGroups[b.id])) ||
      a.subcategory.localeCompare(b.subcategory) ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id),
    );
  }, [availableItems, itemOrder, itemStorageGroups]);

  const selectedItems = useMemo(
    () => orderedAvailableItems.filter((item) => includedItems[item.id]),
    [orderedAvailableItems, includedItems],
  );

  const categoryGroups = useMemo(() => {
    const groups = {};

    selectedItems.forEach((item) => {
      const groupId = itemStorageGroups[item.id];
      if (!groups[groupId]) {
        groups[groupId] = {
          category: storageGroupById[groupId].label,
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

  const orderedCategoryEntries = useMemo(
    () => Object.entries(categoryGroups).sort(([, a], [, b]) => b.itemCount - a.itemCount),
    [categoryGroups],
  );

  const sectionPlans = useMemo(() => {
    const remainingByCategory = Object.fromEntries(
      orderedCategoryEntries.map(([category, group]) => [category, group.itemCount]),
    );

    const allocations = sections.map((section) => ({
      ...section,
      categories: [],
      remainingSlots: section.slotCapacity,
    }));

    for (let sectionIndex = 0; sectionIndex < allocations.length; sectionIndex += 1) {
      const section = allocations[sectionIndex];
      let remainingCapacity = section.remainingSlots;

      for (const [category, group] of orderedCategoryEntries) {
        if (remainingCapacity <= 0) break;
        if ((remainingByCategory[category] ?? 0) <= 0) continue;

        const allocated = Math.min(remainingByCategory[category], remainingCapacity);
        if (allocated <= 0) continue;

        section.categories.push({
          category,
          usedSlots: allocated,
          itemPreview: group.items.slice(0, 3).map((item) => item.name),
        });

        remainingByCategory[category] -= allocated;
        remainingCapacity -= allocated;
      }

      section.remainingSlots = remainingCapacity;
    }

    return allocations;
  }, [sections, orderedCategoryEntries]);

  const overallStats = useMemo(() => {
    const itemTypeCount = selectedItems.length;
    const categoryCount = Object.keys(categoryGroups).length;
    const fillRate = totalSlots > 0 ? (selectedItems.length / totalSlots) * 100 : 0;

    return {
      itemTypeCount,
      categoryCount,
      fillRate,
      totalSections: sections.length,
    };
  }, [categoryGroups, selectedItems, sections, totalSlots]);

  const subcategoryOptions = useMemo(() => {
    const unique = new Set();
    minecraftItems.forEach((item) => {
      if (itemStorageGroups[item.id] === selectedCategory) {
        unique.add(item.subcategory);
      }
    });
    return ['All', ...Array.from(unique).sort()];
  }, [itemStorageGroups, minecraftItems, selectedCategory]);

  const formOptions = useMemo(() => {
    const unique = new Set();
    orderedAvailableItems.forEach((item) => {
      if (itemStorageGroups[item.id] === selectedCategory && (selectedSubcategory === 'All' || item.subcategory === selectedSubcategory)) {
        unique.add(item.form);
      }
    });
    return ['All', ...Array.from(unique).sort()];
  }, [itemStorageGroups, orderedAvailableItems, selectedCategory, selectedSubcategory]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return orderedAvailableItems.filter((item) => {
      const categoryMatch = itemStorageGroups[item.id] === selectedCategory;
      const subcategoryMatch = selectedSubcategory === 'All' || item.subcategory === selectedSubcategory;
      const formMatch = selectedForm === 'All' || item.form === selectedForm;
      const tagMatch = selectedTag === 'All' || item.tags?.includes(selectedTag);
      const queryMatch =
        normalizedQuery.length === 0 ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.id.toLowerCase().includes(normalizedQuery) ||
        item.category.toLowerCase().includes(normalizedQuery) ||
        item.subcategory.toLowerCase().includes(normalizedQuery);

      return categoryMatch && subcategoryMatch && formMatch && tagMatch && queryMatch;
    });
  }, [itemStorageGroups, orderedAvailableItems, searchQuery, selectedCategory, selectedForm, selectedSubcategory, selectedTag]);

  const tagOptions = useMemo(() => {
    const tags = new Set();
    orderedAvailableItems.forEach((item) => item.tags?.forEach((tag) => tags.add(tag)));
    return ['All', ...Array.from(tags).sort()];
  }, [orderedAvailableItems]);

  const categorySummary = useMemo(
    () =>
      Object.entries(categoryGroups).map(([category, data]) => ({
        category,
        items: data.itemCount,
      })),
    [categoryGroups],
  );

  const priorityItems = useMemo(
    () =>
      selectedItems
        .slice()
        .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
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
  };

  const applyPreset = (presetKey) => {
    const preset = inventoryPresets[presetKey];
    if (!preset) return;

    setSelectedPreset(presetKey);
    setIncludedItems(makeIncludedItemMap(minecraftItems, preset.itemIds));
  };

  const resetToDefault = () => {
    setSelectedPreset('survival');
    setIncludedItems(makeIncludedItemMap(minecraftItems));
    setItemGroupOverrides({});
  };

  const exportPlan = () => {
    const payload = {
      totalChests: storageConfig.totalChests,
      chestsPerSection: storageConfig.chestsPerSection,
      totalSections: storageConfig.totalSections,
      chestType,
      includedItems: Object.entries(includedItems)
        .filter(([, selected]) => selected)
        .map(([itemId]) => itemId),
      itemGroupOverrides,
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

        if (parsed.itemGroupOverrides && typeof parsed.itemGroupOverrides === 'object') {
          setItemGroupOverrides(
            Object.fromEntries(
              Object.entries(parsed.itemGroupOverrides).filter(([, groupId]) => storageGroupById[groupId]),
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
      } catch (error) {
        window.alert('Unable to import the selected file. Please choose a valid JSON export.');
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  return (
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
              <option value="class">Class, subclass, then name</option>
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
              <h3>Item scope</h3>
              <p className="helper-text">Choose which game items can receive storage assignments.</p>
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
              {itemScope === 'all' ? 'Includes technical and command-only entries.' : 'Survival-obtainable items only.'}
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
                <button
                  key={group.id}
                  type="button"
                  className={selectedCategory === group.id ? 'tab active' : 'tab'}
                  onClick={() => {
                    setSelectedCategory(group.id);
                    setSelectedSubcategory('All');
                    setSelectedForm('All');
                    setSelectedTag('All');
                  }}
                >
                  {group.label}
                </button>
              ))}
            </div>

            <div className="search-box">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search items, category, or ID"
              />
            </div>
          </div>

          <div className="subcategory-row">
            {subcategoryOptions.map((subcategory) => (
              <button
                key={subcategory}
                type="button"
                className={selectedSubcategory === subcategory ? 'chip active' : 'chip'}
                onClick={() => {
                  setSelectedSubcategory(subcategory);
                  setSelectedForm('All');
                  setSelectedTag('All');
                }}
              >
                {subcategory}
              </button>
            ))}
          </div>

          <div className="subcategory-row">
            {formOptions.map((form) => (
              <button
                key={form}
                type="button"
                className={selectedForm === form ? 'chip active' : 'chip'}
                onClick={() => setSelectedForm(form)}
              >
                {form}
              </button>
            ))}
          </div>

          <div className="advanced-filter">
            <label>
              Official game tag
              <select value={selectedTag} onChange={(event) => setSelectedTag(event.target.value)}>
                {tagOptions.map((tag) => <option key={tag} value={tag}>{tag === 'All' ? 'All official tags' : tag}</option>)}
              </select>
            </label>
          </div>

          <div className="inventory-grid">
            {filteredItems.map((item) => {
              const checked = !!includedItems[item.id];
              return (
                <div key={item.id} className={checked ? 'inventory-card selected' : 'inventory-card'}>
                  <div className="inventory-card-header">
                    <strong>{item.name}</strong>
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
                    <small>{[item.material, item.color, item.form, item.dimension].filter(Boolean).join(' • ')}</small>
                    <small>{item.tags?.length || 0} official tags • class: {item.category} / {item.subcategory}</small>
                  </div>
                  <label className="item-group-control">
                    Store in
                    <select value={itemStorageGroups[item.id]} onChange={(event) => setItemStorageGroup(item.id, event.target.value)}>
                      {storageGroups.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
                    </select>
                  </label>
                </div>
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
              <span>Chest capacity</span>
              <strong>{totalSlots.toLocaleString()}</strong>
            </div>
            <div className="stat-card">
              <span>Fill rate</span>
              <strong>{overallStats.fillRate.toFixed(1)}%</strong>
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
                  <div>
                    <strong>{item.name}</strong>
                    <small>{storageGroupById[itemStorageGroups[item.id]].label} • {item.subcategory}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      <section className="panel allocation-panel">
        <div className="allocation-header">
          <h2>Generated chest allocations</h2>
          <p>
            {storageConfig.totalChests} chests • {chestType} chest type • {storageConfig.chestsPerSection} chests/section • {storageConfig.totalSections} sections
          </p>
        </div>

        <div className="allocation-grid">
          {sectionPlans.map((section) => (
            <div key={section.id} className="allocation-card">
              <div className="allocation-card-header">
                <h3>Section {section.id}</h3>
                <span>{section.chestCount} chests • {section.slotCapacity} slots</span>
              </div>

              {section.categories.length === 0 ? (
                <div className="empty-allocation">No item types assigned yet</div>
              ) : (
                <div className="allocation-list">
                  {section.categories.map((category) => (
                    <div key={`${section.id}-${category.category}`} className="allocation-item">
                      <div>
                        <strong>{category.category}</strong>
                        <small>{category.itemPreview.join(', ') || 'mixed item types'}</small>
                      </div>
                      <span>{category.usedSlots} slots</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;
