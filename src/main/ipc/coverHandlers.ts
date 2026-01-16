
import { ipcMain } from 'electron';
import { coverManager } from '../data/assets/CoverManager'; 
import { safeInvoke } from '../utils/handlerHelper';

export function registerCoverHandlers() {
  ipcMain.handle('get-cover', async (_, filePath: string) => {
    return safeInvoke(() => coverManager.getCover(filePath), '');
  });

  ipcMain.handle('set-manual-cover', async (_, filePath: string, sourcePath: string) => {
    return safeInvoke(() => coverManager.setManualCoverFromPath(filePath, sourcePath), false);
  });
}
