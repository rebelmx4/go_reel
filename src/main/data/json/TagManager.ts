import { BaseJsonManager } from './BaseJsonManager';
import path from 'path';
import { app } from 'electron';

/**
 * Tag definition according to documentation
 */
export interface Tag {
  id: number; // Numeric ID
  name: string; // Tag name
  description: string; // Tag description
}

/**
 * Tag store - grouped by category
 * Example: { "场景与地点": [...], "人物特征": [...] }
 */
export interface TagStore {
  [groupName: string]: Tag[];
}

export class TagManager extends BaseJsonManager<TagStore> {
  constructor() {
    super('tags.json', {});
  }

  /**
   * Create a new tag in a group
   * @param groupName - Group name
   * @param tag - Tag to create
   */
  public createTag(groupName: string, tag: Tag): void {
    const group = this.data[groupName] || [];
    // Check if tag ID already exists in this group
    if (!group.find((t) => t.id === tag.id)) {
      this.set({ [groupName]: [...group, tag] });
    }
  }

  /**
   * Get a tag by ID (searches all groups)
   * @param tagId - Tag ID
   * @returns Tag or undefined
   */
  public getTag(tagId: number): Tag | undefined {
    for (const group of Object.values(this.data)) {
      const tag = group.find((t) => t.id === tagId);
      if (tag) {
        return tag;
      }
    }
    return undefined;
  }

  /**
   * Get all tags in a group
   * @param groupName - Group name
   * @returns Array of tags
   */
  public getTagsByGroup(groupName: string): Tag[] {
    return this.data[groupName] || [];
  }

  /**
   * Get all group names
   * @returns Array of group names
   */
  public getAllGroups(): string[] {
    return Object.keys(this.data);
  }

  /**
   * Update a tag
   * @param tagId - Tag ID
   * @param updates - Partial tag updates
   */
  public updateTag(tagId: number, updates: Partial<Omit<Tag, 'id'>>): void {
    for (const [groupName, tags] of Object.entries(this.data)) {
      const tagIndex = tags.findIndex((t) => t.id === tagId);
      if (tagIndex !== -1) {
        const updatedTags = [...tags];
        updatedTags[tagIndex] = { ...updatedTags[tagIndex], ...updates };
        this.set({ [groupName]: updatedTags });
        return;
      }
    }
  }

  /**
   * Delete a tag by ID (removes from its group)
   * @param tagId - Tag ID
   */
  public deleteTag(tagId: number): void {
    for (const [groupName, tags] of Object.entries(this.data)) {
      const filteredTags = tags.filter((t) => t.id !== tagId);
      if (filteredTags.length !== tags.length) {
        this.set({ [groupName]: filteredTags });
        return;
      }
    }
  }

  /**
   * Get all tags across all groups
   * @returns Array of all tags
   */
  public getAllTags(): Tag[] {
    return Object.values(this.data).flat();
  }

  /**
   * Get path to tag image
   * @param tagId - Tag ID
   * @returns Path like: data/tag_images/[tagId].webp
   */
  public getTagImagePath(tagId: number): string {
    return path.join(app.getPath('userData'), 'data', 'tag_images', `${tagId}.webp`);
  }

  /**
   * Delete a group
   * @param groupName - Group name
   */
  public deleteGroup(groupName: string): void {
    const newData = { ...this.data };
    delete newData[groupName];
    this.data = newData;
    this.save();
  }

  /**
   * Rename a group
   * @param oldName - Old group name
   * @param newName - New group name
   */
  public renameGroup(oldName: string, newName: string): void {
    if (this.data[oldName] && !this.data[newName]) {
      const tags = this.data[oldName];
      const newData = { ...this.data };
      delete newData[oldName];
      newData[newName] = tags;
      this.data = newData;
      this.save();
    }
  }
}
