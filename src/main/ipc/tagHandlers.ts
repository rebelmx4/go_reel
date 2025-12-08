/**
 * Tag IPC Handlers
 * Handles tag data persistence and video tag assignments
 */

import { ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const FILES_FILE = path.join(DATA_DIR, 'files.json');

interface Tag {
  id: number;
  keywords: string;
  description?: string;
  group: string;
  imagePath: string;
}

interface TagsData {
  [group: string]: Tag[];
}

interface PinnedTag {
  tagId: number;
  position: number;
}

/**
 * Load tags data
 */
async function loadTagsData(): Promise<TagsData> {
  try {
    const data = await fs.readFile(TAGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

/**
 * Save tags data
 */
async function saveTagsData(tagsData: TagsData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TAGS_FILE, JSON.stringify(tagsData, null, 2));
}

/**
 * Load pinned tags from settings
 */
async function loadPinnedTags(): Promise<PinnedTag[]> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(data);
    return settings.pinned_tags || [];
  } catch (error) {
    return [];
  }
}

/**
 * Save pinned tags to settings
 */
async function savePinnedTags(pinnedTags: PinnedTag[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  
  let settings: any = {};
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    settings = JSON.parse(data);
  } catch (error) {
    // File doesn't exist, use empty object
  }
  
  settings.pinned_tags = pinnedTags;
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

/**
 * Load video tags from files.json
 */
async function loadVideoTags(videoPath: string): Promise<number[]> {
  try {
    const data = await fs.readFile(FILES_FILE, 'utf-8');
    const filesData = JSON.parse(data);
    const video = filesData.videos?.find((v: any) => v.path === videoPath);
    return video?.tags || [];
  } catch (error) {
    return [];
  }
}

/**
 * Save video tags to files.json
 */
async function saveVideoTags(videoPath: string, tagIds: number[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  
  let filesData: any = { videos: [] };
  try {
    const data = await fs.readFile(FILES_FILE, 'utf-8');
    filesData = JSON.parse(data);
  } catch (error) {
    // File doesn't exist
  }
  
  if (!filesData.videos) {
    filesData.videos = [];
  }
  
  const videoIndex = filesData.videos.findIndex((v: any) => v.path === videoPath);
  if (videoIndex !== -1) {
    filesData.videos[videoIndex].tags = tagIds;
  } else {
    filesData.videos.push({
      path: videoPath,
      tags: tagIds
    });
  }
  
  await fs.writeFile(FILES_FILE, JSON.stringify(filesData, null, 2));
}

/**
 * Register tag IPC handlers
 */
export function registerTagHandlers() {
  // Load all tags
  ipcMain.handle('load-tags', async () => {
    return await loadTagsData();
  });
  
  // Save all tags
  ipcMain.handle('save-tags', async (_, tagsData: TagsData) => {
    await saveTagsData(tagsData);
  });
  
  // Load pinned tags
  ipcMain.handle('load-pinned-tags', async () => {
    return await loadPinnedTags();
  });
  
  // Save pinned tags
  ipcMain.handle('save-pinned-tags', async (_, pinnedTags: PinnedTag[]) => {
    await savePinnedTags(pinnedTags);
  });
  
  // Load video tags
  ipcMain.handle('load-video-tags', async (_, videoPath: string) => {
    return await loadVideoTags(videoPath);
  });
  
  // Save video tags
  ipcMain.handle('save-video-tags', async (_, videoPath: string, tagIds: number[]) => {
    await saveVideoTags(videoPath, tagIds);
  });
}
