import { create } from 'zustand';

/**
 * Tag data structure
 */
export interface Tag {
  id: number;
  keywords: string;      // Global unique keyword
  description?: string;  // Optional description
  group: string;         // Group name
  imagePath: string;     // Cover image path (data/tag_images/[id].webp)
}

/**
 * Tags organized by group
 */
export interface TagsData {
  [group: string]: Tag[];
}

/**
 * Pinned tag for quick access
 */
export interface PinnedTag {
  tagId: number;
  position: number;  // 0-9 for shortcuts 1-5, Q, W, E, R, ~
}

interface TagState {
  // All tags data organized by group
  tagsData: TagsData;
  
  // Pinned tags for quick assignment
  pinnedTags: PinnedTag[];
  
  // Currently selected tags (for search)
  selectedTags: Tag[];
  
  // Loading state
  isLoading: boolean;
  
  // Actions
  loadTags: () => Promise<void>;
  addTag: (tag: Omit<Tag, 'id'>) => Promise<Tag>;
  updateTag: (id: number, updates: Partial<Tag>) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;
  
  // Pinned tags management
  pinTag: (tagId: number, position: number) => void;
  unpinTag: (tagId: number) => void;
  loadPinnedTags: () => void;
  savePinnedTags: () => Promise<void>;
  
  // Selected tags for search
  addSelectedTag: (tag: Tag) => void;
  removeSelectedTag: (tagId: number) => void;
  clearSelectedTags: () => void;
  
  // Utility
  getTagById: (id: number) => Tag | undefined;
  getTagsByGroup: (group: string) => Tag[];
  getAllGroups: () => string[];
  isKeywordUnique: (keyword: string, excludeId?: number) => boolean;
}

export const useTagStore = create<TagState>((set, get) => ({
  tagsData: {},
  pinnedTags: [],
  selectedTags: [],
  isLoading: false,

  loadTags: async () => {
    set({ isLoading: true });
    try {
      if (window.api?.loadTags) {
        const tagsData = await window.api.loadTags();
        set({ tagsData, isLoading: false });
      } else {
        // Fallback to mock data
        const mockData: TagsData = {
          '风景': [
            { id: 1, keywords: '富士山', description: '日本著名山峰', group: '风景', imagePath: 'data/tag_images/1.webp' },
            { id: 2, keywords: '海滩', group: '风景', imagePath: 'data/tag_images/2.webp' },
          ],
          '人物': [
            { id: 3, keywords: '侧脸特写', description: '人物侧面特写镜头', group: '人物', imagePath: 'data/tag_images/3.webp' },
            { id: 4, keywords: '微笑', group: '人物', imagePath: 'data/tag_images/4.webp' },
          ],
        };
        set({ tagsData: mockData, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
      set({ isLoading: false });
    }
  },

  addTag: async (tagData) => {
    const state = get();
    
    // Generate new ID
    let maxId = 0;
    Object.values(state.tagsData).forEach(tags => {
      tags.forEach(tag => {
        if (tag.id > maxId) maxId = tag.id;
      });
    });
    const newId = maxId + 1;
    
    const newTag: Tag = {
      ...tagData,
      id: newId,
      imagePath: `data/tag_images/${newId}.webp`
    };
    
    // Add to group
    const updatedData = { ...state.tagsData };
    if (!updatedData[newTag.group]) {
      updatedData[newTag.group] = [];
    }
    updatedData[newTag.group] = [...updatedData[newTag.group], newTag];
    
    set({ tagsData: updatedData });
    
    // Save to tags.json via IPC
    if (window.api?.saveTags) {
      await window.api.saveTags(updatedData);
    }
    
    return newTag;
  },

  updateTag: async (id, updates) => {
    const state = get();
    const updatedData = { ...state.tagsData };
    
    // Find and update tag
    for (const group in updatedData) {
      const tagIndex = updatedData[group].findIndex(t => t.id === id);
      if (tagIndex !== -1) {
        updatedData[group][tagIndex] = {
          ...updatedData[group][tagIndex],
          ...updates
        };
        break;
      }
    }
    
    set({ tagsData: updatedData });
    
    // TODO: Save to tags.json via IPC
  },

  deleteTag: async (id) => {
    const state = get();
    const updatedData = { ...state.tagsData };
    
    // Remove tag from its group
    for (const group in updatedData) {
      updatedData[group] = updatedData[group].filter(t => t.id !== id);
      if (updatedData[group].length === 0) {
        delete updatedData[group];
      }
    }
    
    set({ tagsData: updatedData });
    
    // TODO: Save to tags.json via IPC
  },

  pinTag: (tagId, position) => {
    const state = get();
    const existing = state.pinnedTags.find(p => p.tagId === tagId);
    if (existing) return; // Already pinned
    
    if (state.pinnedTags.length >= 10) {
      console.warn('Maximum 10 pinned tags allowed');
      return;
    }
    
    set({
      pinnedTags: [...state.pinnedTags, { tagId, position }]
    });
  },

  unpinTag: (tagId) => {
    set(state => ({
      pinnedTags: state.pinnedTags.filter(p => p.tagId !== tagId)
    }));
  },

  loadPinnedTags: async () => {
    if (window.api?.loadPinnedTags) {
      const pinnedTags = await window.api.loadPinnedTags();
      set({ pinnedTags });
    } else {
      set({ pinnedTags: [] });
    }
  },

  savePinnedTags: async () => {
    const state = get();
    if (window.api?.savePinnedTags) {
      await window.api.savePinnedTags(state.pinnedTags);
    }
  },

  addSelectedTag: (tag) => {
    set(state => {
      if (state.selectedTags.find(t => t.id === tag.id)) {
        return state; // Already selected
      }
      return {
        selectedTags: [...state.selectedTags, tag]
      };
    });
  },

  removeSelectedTag: (tagId) => {
    set(state => ({
      selectedTags: state.selectedTags.filter(t => t.id !== tagId)
    }));
  },

  clearSelectedTags: () => {
    set({ selectedTags: [] });
  },

  getTagById: (id) => {
    const state = get();
    for (const tags of Object.values(state.tagsData)) {
      const tag = tags.find(t => t.id === id);
      if (tag) return tag;
    }
    return undefined;
  },

  getTagsByGroup: (group) => {
    return get().tagsData[group] || [];
  },

  getAllGroups: () => {
    return Object.keys(get().tagsData);
  },

  isKeywordUnique: (keyword, excludeId) => {
    const state = get();
    const lowerKeyword = keyword.toLowerCase();
    
    for (const tags of Object.values(state.tagsData)) {
      for (const tag of tags) {
        if (tag.id === excludeId) continue;
        if (tag.keywords.toLowerCase() === lowerKeyword) {
          return false;
        }
      }
    }
    return true;
  },
}));
