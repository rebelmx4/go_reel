/**
 * Shared Path Utilities
 * Pure JavaScript implementation - works in both renderer and main processes
 * No Node.js dependencies
 */

/**
 * Get filename from full path
 * Works with both forward and backward slashes
 */
export function getFilename(filePath: string): string {
  if (!filePath) return '';
  
  // Replace backslashes with forward slashes for consistency
  const normalized = filePath.replace(/\\/g, '/');
  
  // Get the last segment after the last slash
  const parts = normalized.split('/');
  return parts[parts.length - 1] || '';
}

/**
 * Alias for getFilename
 */
export function basename(filePath: string): string {
  return getFilename(filePath);
}

/**
 * Get directory from full path
 */
export function getDirectory(filePath: string): string {
  if (!filePath) return '';
  
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  parts.pop(); // Remove filename
  return parts.join('/') || '/';
}

/**
 * Alias for getDirectory
 */
export function dirname(filePath: string): string {
  return getDirectory(filePath);
}

/**
 * Get file extension (including the dot)
 */
export function getExtension(filePath: string): string {
  const filename = getFilename(filePath);
  const lastDot = filename.lastIndexOf('.');
  
  if (lastDot === -1 || lastDot === 0) return '';
  return filename.slice(lastDot);
}

/**
 * Alias for getExtension
 */
export function extname(filePath: string): string {
  return getExtension(filePath);
}

/**
 * Get filename without extension
 */
export function getFilenameWithoutExt(filePath: string): string {
  const filename = getFilename(filePath);
  const ext = getExtension(filePath);
  return ext ? filename.slice(0, -ext.length) : filename;
}

/**
 * Join path segments
 */
export function joinPath(...segments: string[]): string {
  return segments
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/') // Remove duplicate slashes
    .replace(/\\/g, '/'); // Normalize to forward slashes
}

/**
 * Alias for joinPath
 */
export function join(...segments: string[]): string {
  return joinPath(...segments);
}

/**
 * Normalize path (remove . and .., convert backslashes)
 */
export function normalizePath(filePath: string): string {
  if (!filePath) return '';
  
  // Convert backslashes to forward slashes
  let normalized = filePath.replace(/\\/g, '/');
  
  // Split into parts
  const parts = normalized.split('/');
  const result: string[] = [];
  
  for (const part of parts) {
    if (part === '.' || part === '') {
      // Skip current directory and empty parts
      continue;
    } else if (part === '..') {
      // Go up one directory
      if (result.length > 0 && result[result.length - 1] !== '..') {
        result.pop();
      } else {
        result.push(part);
      }
    } else {
      result.push(part);
    }
  }
  
  return result.join('/') || '/';
}

/**
 * 将本地物理路径转换为浏览器/Electron 可识别的 URL
 * 自动处理 Windows 反斜杠、协议前缀和重复前缀
 */
export function toFileUrl(filePath: string): string {
  if (!filePath) return '';

  // 1. 如果已经是网络地址或 Base64，直接返回
  if (
    filePath.startsWith('http://') || 
    filePath.startsWith('https://') || 
    filePath.startsWith('data:') ||
    filePath.startsWith('blob:')
  ) {
    return filePath;
  }

  // 2. 统一转换为正斜杠
  let normalized = filePath.replace(/\\/g, '/');

  // 3. 避免重复添加 file://
  if (normalized.startsWith('file://')) {
    return normalized;
  }

  // 4. 特殊处理：如果路径以 / 开头（类 Unix），file:// 后跟一个 /
  // 如果是 Windows 路径（如 C:/），file:/// 会更标准，但 file://C:/ 在 Electron 中也能识别
  // 为了最大的兼容性，通常使用 file:// + 路径
  return `file://${normalized}`;
}

 export interface FolderTreeNode {
  label: string;
  value: string; // 存储完整路径
  children?: FolderTreeNode[];
}

/**
 * 将平铺的视频路径数组构建为文件夹树
 * @param videoPaths 所有的视频完整路径
 * @param rootPath 视频源根目录 (如 C:/Videos)
 */
export function buildFolderTree(videoPaths: string[], rootPath: string): FolderTreeNode[] {
  // 1. 如果 rootPath 没准备好，不进行构建，防止生成错误的 "/D:" 路径
  if (!rootPath) return [];

  // 2. 标准化根路径：统一正斜杠，移除末尾斜杠
  const normalizedRoot = rootPath.replace(/\\/g, '/').replace(/\/$/, '');
  
  const treeMap: Record<string, FolderTreeNode> = {};
  const roots: FolderTreeNode[] = [];

  videoPaths.forEach((fullPath) => {
    // 标准化当前处理的文件路径
    const normalizedPath = fullPath.replace(/\\/g, '/');
    
    // 仅处理属于 rootPath 范围内的路径
    if (!normalizedPath.startsWith(normalizedRoot)) return;

    // 获取相对于根目录的路径部分
    // 例如: root="D:/V", full="D:/V/Action/test.mp4" -> relativePath="Action/test.mp4"
    const relativePath = normalizedPath.substring(normalizedRoot.length).replace(/^\//, '');
    const segments = relativePath.split('/');
    segments.pop(); // 移除文件名，只保留目录部分

    let currentPath = normalizedRoot;

    segments.forEach((segment) => {
      const parentPath = currentPath;
      
      // 拼接当前层级的完整路径作为唯一的 value (ID)
      // 注意：处理盘符后的斜杠拼接，防止出现 D://m
      currentPath = parentPath.endsWith('/') 
        ? `${parentPath}${segment}` 
        : `${parentPath}/${segment}`;

      if (!treeMap[currentPath]) {
        const newNode: FolderTreeNode = {
          label: segment,
          value: currentPath,
          children: []
        };
        treeMap[currentPath] = newNode;

        // 如果该节点是根路径的直接子目录，则放入 roots
        if (parentPath === normalizedRoot) {
          roots.push(newNode);
        } else {
          // 否则放入其父节点的 children 中
          const parentNode = treeMap[parentPath];
          if (parentNode) {
            parentNode.children = parentNode.children || [];
            parentNode.children.push(newNode);
          }
        }
      }
    });
  });

  // 3. 对每一层级按字母顺序排序
  const sortNodes = (nodes: FolderTreeNode[]) => {
    nodes.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' }));
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        sortNodes(node.children);
      }
    });
  };

  sortNodes(roots);
  return roots;
}

/**
 * 获取包含视频的最浅层文件夹路径
 * 用于页面初始化时定位到第一个有内容的目录
 */
export function getShallowestVideoFolder(videoPaths: string[], rootPath: string): string {
  if (videoPaths.length === 0) return rootPath;

  const normalizedRoot = rootPath.replace(/\\/g, '/').replace(/\/$/, '');
  let shallowestPath = '';
  let minDepth = Infinity;

  videoPaths.forEach((fullPath) => {
    const dir = getDirectory(fullPath).replace(/\\/g, '/');
    if (!dir.startsWith(normalizedRoot)) return;

    // 计算深度：相对于 rootPath 有几级目录
    const relative = dir.substring(normalizedRoot.length).replace(/^\//, '');
    const depth = relative === '' ? 0 : relative.split('/').length;

    if (depth < minDepth) {
      minDepth = depth;
      shallowestPath = dir;
    }
  });

  return shallowestPath || normalizedRoot;
}