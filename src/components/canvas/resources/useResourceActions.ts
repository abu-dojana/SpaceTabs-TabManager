import React from 'react';
import { db } from '@/db';
import { type ResourceSection, type ResourceItem } from '@/db/schema';
import { recordTombstone, recordTombstones } from '@/services/driveSync';
import { focusOrOpenTab } from '@/services/tabManager';
import { decodeRealUrl, extractDomain } from '@/utils/urlFilter';
import { usePersistedSet } from '@/hooks/usePersistedSet';
import { detectResourceType, normalizeResourceUrl } from './resourceUtils';

export interface ResourceModalState {
  isOpen: boolean;
  mode: 'add' | 'edit';
  sectionId: string;
  itemId?: string;
  title: string;
  url: string;
}

interface UseResourceActionsParams {
  targetSpaceId: string;
  sections: ResourceSection[] | undefined;
  itemsBySection: Map<string, ResourceItem[]>;
}

export function useResourceActions({
  targetSpaceId,
  sections,
  itemsBySection,
}: UseResourceActionsParams) {
  // UI state
  const [collapsedSections, setCollapsedSections] = usePersistedSet(
    'spacetabs_collapsed_resource_sections'
  );
  const [isAddingSection, setIsAddingSection] = React.useState(false);
  const [newSectionTitle, setNewSectionTitle] = React.useState('');
  const [editingSectionId, setEditingSectionId] = React.useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = React.useState('');

  // Dropdown states
  const [activeSectionMenuId, setActiveSectionMenuId] = React.useState<string | null>(null);
  const [activeItemMenuId, setActiveItemMenuId] = React.useState<string | null>(null);
  const [addOpenTabSectionId, setAddOpenTabSectionId] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Add / Edit Resource Modal
  const [resourceModal, setResourceModal] = React.useState<ResourceModalState>({
    isOpen: false,
    mode: 'add',
    sectionId: '',
    title: '',
    url: '',
  });

  // Drag and drop state
  const [draggingItemId, setDraggingItemId] = React.useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = React.useState<string | null>(null);

  const sectionMenuRef = React.useRef<HTMLDivElement>(null);
  const itemMenuRef = React.useRef<HTMLDivElement>(null);
  const openTabsDropdownRef = React.useRef<HTMLDivElement>(null);
  const editSectionInputRef = React.useRef<HTMLInputElement>(null);

  // Click-away listener to dismiss active menus
  React.useEffect(() => {
    if (!activeSectionMenuId && !activeItemMenuId && !addOpenTabSectionId) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (sectionMenuRef.current && !sectionMenuRef.current.contains(e.target as Node)) {
        setActiveSectionMenuId(null);
      }
      if (itemMenuRef.current && !itemMenuRef.current.contains(e.target as Node)) {
        setActiveItemMenuId(null);
      }
      if (openTabsDropdownRef.current && !openTabsDropdownRef.current.contains(e.target as Node)) {
        setAddOpenTabSectionId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveSectionMenuId(null);
        setActiveItemMenuId(null);
        setAddOpenTabSectionId(null);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeSectionMenuId, activeItemMenuId, addOpenTabSectionId]);

  // Focus rename section input
  React.useEffect(() => {
    if (editingSectionId && editSectionInputRef.current) {
      editSectionInputRef.current.focus();
      editSectionInputRef.current.select();
    }
  }, [editingSectionId]);

  // Toggle section collapse
  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  // Create new section
  const handleCreateSection = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = newSectionTitle.trim() || 'New Section';
    const count = sections?.length || 0;
    const now = Date.now();

    await db.resourceSections.add({
      id: crypto.randomUUID(),
      spaceId: targetSpaceId,
      title,
      order: count,
      updatedAt: now,
    });

    setNewSectionTitle('');
    setIsAddingSection(false);
  };

  // Start editing section title
  const handleStartRenameSection = (section: ResourceSection) => {
    setEditingSectionId(section.id);
    setEditingSectionTitle(section.title);
    setActiveSectionMenuId(null);
  };

  // Save renamed section
  const handleSaveRenameSection = async () => {
    if (!editingSectionId) return;
    const title = editingSectionTitle.trim();
    if (title) {
      await db.resourceSections.update(editingSectionId, {
        title,
        updatedAt: Date.now(),
      });
    }
    setEditingSectionId(null);
  };

  // Delete section and its items
  const handleDeleteSection = async (sectionId: string) => {
    setActiveSectionMenuId(null);
    setCollapsedSections((prev) => {
      if (!prev.has(sectionId)) return prev;
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });
    const itemsToDelete = await db.resourceItems.where('sectionId').equals(sectionId).toArray();
    recordTombstones([
      { id: sectionId, table: 'resource_sections' as const },
      ...itemsToDelete.map((it) => ({ id: it.id, table: 'resource_items' as const })),
    ]).catch(() => {});

    for (const it of itemsToDelete) {
      await db.resourceItems.delete(it.id);
    }
    await db.resourceSections.delete(sectionId);
  };

  // Open all resources in a section
  const handleOpenAllInSection = async (sectionId: string) => {
    setActiveSectionMenuId(null);
    const items = itemsBySection.get(sectionId) || [];
    for (const it of items) {
      try {
        await chrome.tabs.create({ url: it.url, active: false });
      } catch {}
    }
  };

  // Open resource link
  const handleOpenResource = async (url: string) => {
    await focusOrOpenTab(url);
  };

  // Copy resource link
  const handleCopyLink = async (id: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    setActiveItemMenuId(null);
  };

  // Delete resource item
  const handleDeleteItem = async (itemId: string) => {
    setActiveItemMenuId(null);
    recordTombstone(itemId, 'resource_items').catch(() => {});
    await db.resourceItems.delete(itemId);
  };

  // Move resource item to another section
  const handleMoveItemToSection = async (itemId: string, newSectionId: string) => {
    setActiveItemMenuId(null);
    const targetItems = itemsBySection.get(newSectionId) || [];
    await db.resourceItems.update(itemId, {
      sectionId: newSectionId,
      order: targetItems.length,
      updatedAt: Date.now(),
    });
  };

  // Open Add Resource modal
  const handleOpenAddResource = (sectionId: string) => {
    setActiveSectionMenuId(null);
    setResourceModal({
      isOpen: true,
      mode: 'add',
      sectionId,
      title: '',
      url: '',
    });
  };

  // Open Edit Resource modal
  const handleOpenEditResource = (item: ResourceItem) => {
    setActiveItemMenuId(null);
    setResourceModal({
      isOpen: true,
      mode: 'edit',
      sectionId: item.sectionId,
      itemId: item.id,
      title: item.title,
      url: item.url,
    });
  };

  // Submit Add / Edit Resource form
  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceModal.url.trim()) return;

    const cleanUrl = normalizeResourceUrl(resourceModal.url);
    const title = resourceModal.title.trim() || extractDomain(cleanUrl);
    const type = detectResourceType(cleanUrl);
    const now = Date.now();

    if (resourceModal.mode === 'add') {
      const existingItems = itemsBySection.get(resourceModal.sectionId) || [];
      await db.resourceItems.add({
        id: crypto.randomUUID(),
        sectionId: resourceModal.sectionId,
        title,
        url: cleanUrl,
        type,
        order: existingItems.length,
        createdAt: now,
        updatedAt: now,
      });
    } else if (resourceModal.mode === 'edit' && resourceModal.itemId) {
      await db.resourceItems.update(resourceModal.itemId, {
        title,
        url: cleanUrl,
        type,
        updatedAt: now,
      });
    }

    setResourceModal({ isOpen: false, mode: 'add', sectionId: '', title: '', url: '' });
  };

  // Workona-style: Add Open Tab as Resource
  const handleAddOpenTabAsResource = async (
    sectionId: string,
    tab: { title: string; url: string; favIconUrl?: string }
  ) => {
    const existingItems = itemsBySection.get(sectionId) || [];
    const now = Date.now();
    const type = detectResourceType(tab.url);

    await db.resourceItems.add({
      id: crypto.randomUUID(),
      sectionId,
      title: tab.title || extractDomain(tab.url),
      url: decodeRealUrl(tab.url),
      favIconUrl: tab.favIconUrl,
      type,
      order: existingItems.length,
      createdAt: now,
      updatedAt: now,
    });

    setAddOpenTabSectionId(null);
  };

  // Drag and drop handlers
  const handleItemDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggingItemId(itemId);
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleSectionDrop = async (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    setDragOverSectionId(null);
    if (!draggingItemId) return;

    const item = await db.resourceItems.get(draggingItemId);
    if (!item) return;

    if (item.sectionId !== targetSectionId) {
      const targetItems = itemsBySection.get(targetSectionId) || [];
      await db.resourceItems.update(draggingItemId, {
        sectionId: targetSectionId,
        order: targetItems.length,
        updatedAt: Date.now(),
      });
    }
    setDraggingItemId(null);
  };

  return {
    collapsedSections,
    isAddingSection,
    setIsAddingSection,
    newSectionTitle,
    setNewSectionTitle,
    editingSectionId,
    setEditingSectionId,
    editingSectionTitle,
    setEditingSectionTitle,
    activeSectionMenuId,
    setActiveSectionMenuId,
    activeItemMenuId,
    setActiveItemMenuId,
    addOpenTabSectionId,
    setAddOpenTabSectionId,
    copiedId,
    resourceModal,
    setResourceModal,
    dragOverSectionId,
    setDragOverSectionId,
    sectionMenuRef,
    itemMenuRef,
    openTabsDropdownRef,
    editSectionInputRef,
    toggleSectionCollapse,
    handleCreateSection,
    handleStartRenameSection,
    handleSaveRenameSection,
    handleDeleteSection,
    handleOpenAllInSection,
    handleOpenResource,
    handleCopyLink,
    handleDeleteItem,
    handleMoveItemToSection,
    handleOpenAddResource,
    handleOpenEditResource,
    handleSaveResource,
    handleAddOpenTabAsResource,
    handleItemDragStart,
    handleSectionDrop,
  };
}
