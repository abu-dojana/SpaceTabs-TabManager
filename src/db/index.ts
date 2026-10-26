import Dexie, { type Table } from 'dexie';
import type {
  Space,
  Tab,
  ResourceSection,
  ResourceItem,
  Note,
  Task,
} from './schema';

export class TabManagerDB extends Dexie {
  spaces!: Table<Space, string>;
  tabs!: Table<Tab, string>;
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
  }
}

export const db = new TabManagerDB();
