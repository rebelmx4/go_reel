import { create } from 'zustand';
// 导入共享模型以保持一致性
import { Tag, PinnedTag, TagLibrary, CategoryConfig } from '../../../shared/models';

/**
 * 对应后端 Record<string, Tag[]> 的结构
 */
export interface TagsData {
  [group: string]: Tag[];
}

interface TagState {
  tagsData: TagsData;
  pinnedTags: PinnedTag[];
  groupConfigs:  CategoryConfig[];
  selectedTags: Tag[];
  isLoading: boolean;

  // 核心动作
  setInitialData: (library: TagLibrary) => void;
  refreshTagLibrary: () => Promise<void>;
  
  // 创建标签：现在需要 imageBase64 并且由后端返回完整的 Tag 对象
  addTag: (params: { 
    keywords: string; 
    group: string; 
    description?: string; 
    imageBase64: string 
  }) => Promise<Tag | null>;
  getGroupColor: (groupName: string) => string;

  // 替换封面 (对应 api.replaceTagCover)
  replaceTagCover: (tagId: number, imageBase64: string) => Promise<boolean>;

  // 标签关联与保存
  saveTags: (data: TagsData) => Promise<void>;

  // 置顶管理
  pinTag: (tagId: number) => Promise<void>;
  unpinTag: (tagId: number) => Promise<void>;
  savePinnedTags: () => Promise<void>;

  // 搜索与过滤逻辑
  addSelectedTag: (tag: Tag) => void;
  removeSelectedTag: (tagId: number) => void;
  clearSelectedTags: () => void;

  // 工具方法
  getTagById: (id: number) => Tag | undefined;
  getAllGroups: () => string[];
  isKeywordUnique: (keyword: string) => boolean;

  updateTag: (tagId: number, updates: { keywords?: string; group?: string; description?: string }) => Promise<boolean>;
}

export const useTagStore = create<TagState>((set, get) => ({
  tagsData: {},
  pinnedTags: [],
  groupConfigs: [],
  selectedTags: [],
  isLoading: false,

  setInitialData: (library: TagLibrary) => {
    set({ 
      tagsData: library.tagsData || {}, 
      pinnedTags: library.pinnedTags || [],
      groupConfigs: library.groupConfigs || [], 
      isLoading: false 
    });
  },

  // 1. 加载完整库
  refreshTagLibrary: async () => {
    set({ isLoading: true });
    try {
      // 对应 index.d.ts 中的 loadTagLibrary
      const library: TagLibrary = await window.api.loadTagLibrary();
      set({ 
        tagsData: library.tagsData || {}, 
        pinnedTags: library.pinnedTags || [],
        groupConfigs: library.groupConfigs || [], 
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to load tag library:', error);
      set({ isLoading: false });
    }
  },

  // 2. 原子化创建标签
  addTag: async (params) => {
    try {
      // 调用后端接口，后端负责生成 ID、保存图片、写入 JSON
      const newTag = await window.api.addTag(params);
      
      // 更新本地状态
      set((state) => {
        const updatedData = { ...state.tagsData };
        if (!updatedData[params.group]) {
          updatedData[params.group] = [];
        }
        updatedData[params.group] = [...updatedData[params.group], newTag];
        return { tagsData: updatedData };
      });

      return newTag;
    } catch (error) {
      console.error('Failed to add tag:', error);
      return null;
    }
  },

  getGroupColor: (groupName: string) => {
    const configs = get().groupConfigs;
    const category = configs.find(c => c.groups.includes(groupName));
    return category?.color || '#4dabf7'; // 默认蓝
  },

  // 3. 替换封面
  replaceTagCover: async (tagId, imageBase64) => {
    try {
      const result = await window.api.replaceTagCover({ tagId, imageBase64 });
      if (result.success) {
        // 更新本地 URL 触发 UI 刷新（加 timestamp 防止缓存）
        set((state) => {
          const newData = { ...state.tagsData };
          for (const group in newData) {
            const index = newData[group].findIndex(t => t.id === tagId);
            if (index !== -1) {
              newData[group][index] = { 
                ...newData[group][index], 
                imagePath: `${result.imagePath}?t=${Date.now()}` 
              };
              break;
            }
          }
          return { tagsData: newData };
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Replace cover failed:', error);
      return false;
    }
  },

  // 4. 保存整个标签结构 (排序或重组后调用)
  saveTags: async (data) => {
    try {
      await window.api.saveTags(data);
      set({ tagsData: data });
    } catch (error) {
      console.error('Failed to save tags:', error);
    }
  },

  // 5. 置顶逻辑
  pinTag: async (tagId) => {
    const { pinnedTags } = get();
    if (pinnedTags.some(p => p.tagId === tagId)) return;
    
    const newPinned = [
      ...pinnedTags, 
      { tagId, position: pinnedTags.length }
    ];
    set({ pinnedTags: newPinned });
    await get().savePinnedTags();
  },

  unpinTag: async (tagId) => {
    const newPinned = get().pinnedTags
      .filter(p => p.tagId !== tagId)
      .map((p, index) => ({ ...p, position: index })); // 重新排序
    
    set({ pinnedTags: newPinned });
    await get().savePinnedTags();
  },

  savePinnedTags: async () => {
    try {
      await window.api.savePinnedTags(get().pinnedTags);
    } catch (error) {
      console.error('Failed to save pinned tags:', error);
    }
  },

  // --- 搜索与 UI 辅助 ---
  addSelectedTag: (tag) => {
    set(state => ({
      selectedTags: state.selectedTags.some(t => t.id === tag.id) 
        ? state.selectedTags 
        : [...state.selectedTags, tag]
    }));
  },

  removeSelectedTag: (tagId) => {
    set(state => ({
      selectedTags: state.selectedTags.filter(t => t.id !== tagId)
    }));
  },

  clearSelectedTags: () => set({ selectedTags: [] }),

  getTagById: (id) => {
    const { tagsData } = get();
    for (const group in tagsData) {
      const tag = tagsData[group].find(t => t.id === id);
      if (tag) return tag;
    }
    return undefined;
  },

  getAllGroups: () => Object.keys(get().tagsData),

  updateTag: async (tagId, updates) => {
    try {
      const res = await window.api.updateTag(tagId, updates);
      if (res.success) {
        // 本地状态乐观更新 (最简单的办法是直接重刷库，或者手动操作内存)
        await get().refreshTagLibrary(); 
        return true;
      }
      return false;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  isKeywordUnique: (keyword) => {
    const { tagsData } = get();
    const lowerKey = keyword.toLowerCase();
    return !Object.values(tagsData)
      .flat()
      .some(t => t.keywords.toLowerCase() === lowerKey);
  }
}));