import fs from 'fs-extra'
import path from 'path'
import { app } from 'electron'
import log from 'electron-log'

export interface BaseJsonManagerOptions {
  backupOnLoad?: boolean
}

export abstract class BaseJsonManager<T> {
  protected filePath: string
  protected data: T
  protected defaultData: T
  protected options: BaseJsonManagerOptions

  constructor(fileName: string, defaultData: T, options: BaseJsonManagerOptions = {}) {
    this.filePath = path.join(app.getAppPath(), 'data/data', fileName)
    this.defaultData = defaultData
    this.options = { backupOnLoad: false, ...options }

    this.data = this._cloneData(this.defaultData)
  }

  private _cloneData(data: T): T {
    if (Array.isArray(data)) {
      return [...data] as T
    }

    return { ...(data as any) } as T
  }

  public async load(): Promise<void> {
    const fileExists = await fs.pathExists(this.filePath)

    if (fileExists && this.options.backupOnLoad) {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .replace(/[T]/g, '_')
        .replace(/[Z]/g, '')
      const backupPath = `${this.filePath}.${timestamp}.json`
      try {
        await fs.copy(this.filePath, backupPath)
        log.info(`成功创建备份文件: ${backupPath}`)
      } catch (backupError) {
        log.warn(`创建备份文件 ${backupPath} 失败:`, backupError)
      }
    }

    if (!fileExists) {
      log.info(`配置文件 ${this.filePath} 不存在，将使用默认设置创建。`)
      await this.save()
      return
    }

    try {
      const fileContent = await fs.readJson(this.filePath)
      log.info(`成功加载配置文件: ${this.filePath}`)
      if (Array.isArray(this.defaultData)) {
        this.data = [...fileContent] as T
      } else {
        this.data = { ...this._cloneData(this.defaultData), ...fileContent } as T
      }
    } catch (error) {
      log.error(`读取配置文件 ${this.filePath} 失败，将重置为默认设置。错误:`, error)
      await this.save()
    }
  }

  public async save(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.filePath))
      await fs.writeJson(this.filePath, this.data, { spaces: 2 })
    } catch (error) {
      log.error(`保存文件 ${this.filePath} 失败:`, error)
    }
  }

  public get(): T {
    return this.data
  }

  public set(newData: Partial<T>): void {
    if (Array.isArray(this.data) && Array.isArray(newData)) {
      this.data = [...newData] as T
    } else {
      this.data = { ...(this.data as any), ...newData } as T
    }
    this.save()
  }
}
