/**
 * Settings IPC Handlers
 * Handles saving and loading global settings
 */

import { ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SettingsManager } from '../data/json/SettingsManager'; 

const settingsManager = new SettingsManager();

const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

interface Settings {
  volume?: number;
  [key: string]: any;
}

/**
 * Load settings from file
 */
async function loadSettings(): Promise<Settings> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return defaults if file doesn't exist
    return { volume: 80 };
  }
}

/**
 * Save settings to file
 */
async function saveSettings(settings: Settings): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

/**
 * Register settings IPC handlers
 */
export function registerSettingsHandlers() {
  // Save volume
  ipcMain.handle('save-volume', async (_, volume: number) => {
    const settings = await loadSettings();
    settings.volume = volume;
    await saveSettings(settings);
  });

  // Load volume
  ipcMain.handle('load-volume', async () => {
    const settings = await loadSettings();
    return settings.volume || 80; // Default 80%
  });
  
  // Load all settings
  ipcMain.handle('load-settings', async () => {
    return await loadSettings();
  });

  ipcMain.handle('get-screenshot-export-path', async () => {
    await settingsManager.waitForReady();
    return settingsManager.getScreenshotExportPath();
  });
}
