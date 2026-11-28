import Dexie, { type Table } from 'dexie';
import type {
  Space,
  Tab,
  TabGroup,
  ResourceSection,
  ResourceItem,
  Note,
  Task,
} from './schema';

export class TabManagerDB extends Dexie {
  spaces!: Table<Space, string>;
  tabs!: Table<Tab, string>;
  tabGroups!: Table<TabGroup, string>;
  resourceSections!: Table<ResourceSection, string>;
  resourceItems!: Table<ResourceItem, string>;
  notes!: Table<Note, string>;
  tasks!: Table<Task, string>;

  constructor() {
    super('TabManagerDB');
    this.version(1).stores({
      spaces: 'id, order, updatedAt',
      tabs: 'id, chromeTabId, spaceId, order, updatedAt',
      resourceSections: 'id, spaceId, order, updatedAt',
      resourceItems: 'id, sectionId, updatedAt',
      notes: 'id, spaceId, updatedAt',
      tasks: 'id, spaceId, order, updatedAt',
    });

    this.version(2).stores({
      resourceItems: 'id, sectionId, order, updatedAt',
    });

    this.version(3).stores({
      tabs: 'id, chromeTabId, spaceId, windowId, order, updatedAt',
    });

    this.version(4).stores({
      notes: 'id, spaceId, order, updatedAt',
    });

    this.version(5).stores({
      tabGroups: 'id, spaceId, order, updatedAt',
      tabs: 'id, chromeTabId, spaceId, groupId, windowId, order, updatedAt',
    });
  }
}

export const db = new TabManagerDB();
