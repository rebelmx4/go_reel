import { ipcMain } from 'electron'
import { annotationManager } from '../data/json/AnnotationManager'
import { Annotation } from '../../shared/models'
import { safeInvoke } from '../utils/handlerHelper'

export function registerAnnotationHandlers() {
  // 添加 or 更新
  ipcMain.handle('update-annotation', async (_, filePath: string, updates: Partial<Annotation>) => {
    return safeInvoke(
      async () => {
        await annotationManager.updateAnnotation(filePath, updates)
        return { success: true }
      },
      { success: false }
    )
  })

  // 获取
  ipcMain.handle('get-annotation', async (_, filePath: string) => {
    return safeInvoke(async () => {
      return await annotationManager.getAnnotation(filePath)
    }, null)
  })

  ipcMain.handle(
    'update-annotations-batch',
    async (_, filePaths: string[], updates: Partial<Annotation>) => {
      return safeInvoke(
        async () => {
          await annotationManager.updateAnnotationsBatch(filePaths, updates)
          return { success: true }
        },
        { success: false }
      )
    }
  )
}
