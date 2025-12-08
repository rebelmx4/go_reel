# Data Module Structure

This directory contains all data management classes for the application, organized into two subdirectories:

## Directory Structure

```
src/main/data/
├── assets/              # Asset managers (binary files)
│   ├── BaseAssetManager.ts
│   ├── ScreenshotManager.ts
│   ├── CoverManager.ts
│   └── index.ts
├── json/                # JSON managers (data files)
│   ├── BaseJsonManager.ts
│   ├── MetadataManager.ts
│   ├── SettingsManager.ts
│   ├── TagManager.ts
│   ├── HistoryManager.ts
│   └── index.ts
└── index.ts             # Main exports
```

## Asset Managers (`assets/`)

Manage binary files like screenshots, covers, and video clips.

### BaseAssetManager
- Provides hash-based nested directory structure for screenshots
- Provides flat directory structure for covers
- Helper methods for file operations

### ScreenshotManager
- Hash-based storage: `data/screenshots/[hash前2位]/[完整hash]/`
- Manual screenshots: `[timestamp]_m.webp`
- Auto screenshots: `[timestamp]_a.webp`
- Video clips: `v_[timestamp].mp4`

### CoverManager
- Default covers: `[hash]_d.webp` (auto-generated at 20% of video)
- Manual covers: `[hash].webp` (user-selected)
- Priority: manual > default > null

## JSON Managers (`json/`)

Manage JSON data files in `userData/data/`.

### MetadataManager (`files.json`)
- Video metadata keyed by hash
- Fields: paths, like_count, is_favorite, rotation, screenshot_rotation, tags

### SettingsManager (`settings.json`)
- Application settings
- Sections: paths, playback, skip_frame, key_bindings

### TagManager (`tags.json`)
- Grouped tag structure
- Numeric tag IDs
- Tag images in `data/tag_images/[tagId].webp`

### HistoryManager (`recent.json`)
- Simple array of absolute paths
- Most recent first, limited to 100 items

## Usage

```typescript
// Import from main index
import { 
  ScreenshotManager, 
  CoverManager, 
  MetadataManager,
  SettingsManager,
  TagManager,
  HistoryManager 
} from '@/main/data';

// Or import from subdirectories
import { ScreenshotManager } from '@/main/data/assets';
import { MetadataManager } from '@/main/data/json';
```

## Migration Notes

The old manager files in the root `data/` directory are deprecated and should not be used. All imports should be updated to use the new structure.

Old files to be removed:
- `BaseAssetManager.ts` (moved to `assets/`)
- `BaseJsonManager.ts` (moved to `json/`)
- `ScreenshotManager.ts` (moved to `assets/`)
- `CoverManager.ts` (moved to `assets/`)
- `MetadataManager.ts` (moved to `json/`)
- `SettingsManager.ts` (moved to `json/`)
- `TagManager.ts` (moved to `json/`)
- `HistoryManager.ts` (moved to `json/`)
