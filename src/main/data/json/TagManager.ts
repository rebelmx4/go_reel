import { BaseJsonManager } from './BaseJsonManager'
import { TagLibrary, Tag, PinnedTag } from '../../../shared/models'
import path from 'path'
import { app } from 'electron'
import fs from 'fs-extra'

export class TagManager extends BaseJsonManager<TagLibrary> {
  constructor() {
    super('tags.json', { tagsData: {}, pinnedTags: [], groupConfigs: [] })
  }

  // 获取物理存储根目录
  private getStorageDir(): string {
    return path.join(app.getAppPath(), 'data/data')
  }

  // 物理保存 Base64 图片
  private async saveImagePhysical(tagId: number, base64: string): Promise<string> {
    const relativePath = `tag_images/${tagId}.webp`
    const fullPath = path.join(this.getStorageDir(), relativePath)

    await fs.ensureDir(path.dirname(fullPath))
    const buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
    await fs.writeFile(fullPath, buffer)

    return fullPath
  }

  /**
   * 原子化创建标签
   */
  public async addTag(params: {
    keywords: string
    group: string
    description?: string
    imageBase64: string // 必须传
  }): Promise<Tag> {
    const allTags = Object.values(this.data.tagsData).flat()
    if (allTags.some((t) => t.keywords.toLowerCase() === params.keywords.toLowerCase())) {
      throw new Error(`Tag with keywords "${params.keywords}" already exists.`)
    }

    // 1. 生成 ID
    let maxId = 0
    Object.values(this.data.tagsData).forEach((group) => {
      group.forEach((t) => {
        if (t.id > maxId) maxId = t.id
      })
    })
    const newId = maxId + 1

    // 2. 保存图片
    const imagePath = await this.saveImagePhysical(newId, params.imageBase64)

    // 3. 构建对象并存入 JSON
    const newTag: Tag = {
      id: newId,
      keywords: params.keywords,
      description: params.description,
      imagePath: imagePath
    }

    const updatedTagsData = { ...this.data.tagsData }
    if (!updatedTagsData[params.group]) updatedTagsData[params.group] = []
    updatedTagsData[params.group].push(newTag)

    this.set({ tagsData: updatedTagsData })
    return newTag
  }

  /**
   * 仅替换封面
   */
  public async replaceTagCover(tagId: number, base64: string): Promise<string> {
    return await this.saveImagePhysical(tagId, base64)
  }

  public getLibrary(): TagLibrary {
    return this.data
  }

  /**
   * 保存置顶标签
   */
  public setPinnedTags(pinned: PinnedTag[]): void {
    this.set({ pinnedTags: pinned })
  }

  public async updateTag(
    tagId: number,
    updates: {
      keywords?: string
      group?: string
      description?: string
    }
  ): Promise<void> {
    const { tagsData } = this.data
    let targetTag: Tag | null = null
    let oldGroupName = ''

    // 1. 查找标签所在位置
    for (const groupName in tagsData) {
      const index = tagsData[groupName].findIndex((t) => t.id === tagId)
      if (index !== -1) {
        targetTag = tagsData[groupName][index]
        oldGroupName = groupName
        break
      }
    }

    if (!targetTag) throw new Error(`Tag with ID ${tagId} not found.`)

    // 2. 准备更新后的对象
    const updatedTag: Tag = {
      ...targetTag,
      keywords: updates.keywords ?? targetTag.keywords,
      description: updates.description ?? targetTag.description
    }

    const newGroupName = updates.group || oldGroupName
    const newTagsData = { ...tagsData }

    // 3. 处理分组迁移逻辑
    if (newGroupName !== oldGroupName) {
      // 从旧组移除
      newTagsData[oldGroupName] = newTagsData[oldGroupName].filter((t) => t.id !== tagId)
      if (newTagsData[oldGroupName].length === 0) delete newTagsData[oldGroupName]

      // 加入新组
      if (!newTagsData[newGroupName]) newTagsData[newGroupName] = []
      newTagsData[newGroupName].push(updatedTag)
    } else {
      // 仅在原组内更新内容
      newTagsData[oldGroupName] = newTagsData[oldGroupName].map((t) =>
        t.id === tagId ? updatedTag : t
      )
    }

    this.set({ tagsData: newTagsData })
  }
}

export const tagManager = new TagManager()
