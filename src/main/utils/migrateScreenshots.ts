import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * 指向截图根目录
 */
const SCREENSHOTS_BASE_DIR = "E:\\go_reel\\data\\screenshots"; 

 async function walkAndRename(currentPath: string) {
  const items = await fs.readdir(currentPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(currentPath, item.name);

    if (item.isDirectory()) {
      await walkAndRename(fullPath);
    } else if (item.isFile()) {
      const fileName = item.name as string;

      if (fileName.endsWith('.webp')) {
        // 正则：只抓取开头的数字部分
        const match = fileName.match(/^(\d+)/);

        if (match) {
          const timestampPart = match[1]; // 仅仅拿数字部分
          
          // 目标文件名：数字补齐8位 + .webp (彻底扔掉 _m, _a 等后缀)
          const newName = `${timestampPart.padStart(8, '0')}.webp`;
          const newFullPath = path.join(currentPath, newName);

          // 如果新旧文件名不一样，才执行重命名
          if (fileName !== newName) {
            try {
              // 检查目标是否存在 (比如 123_m 和 123 都想变成 00000123)
              if (!(await fs.pathExists(newFullPath))) {
                await fs.rename(fullPath, newFullPath);
                console.log(`[成功] ${fileName} -> ${newName}`);
              } else {
                // 如果目标已存在（说明之前已经处理过同秒数的不同版本），则删除旧的冗余文件
                await fs.remove(fullPath);
                console.warn(`[清理] 目标已存在，删除冗余文件: ${fileName}`);
              }
            } catch (err) {
              console.error(`[失败] 处理 ${fileName} 时出错:`, err);
            }
          }
        }
      }
    }
  }
}

export async function start() {
  try {
    if (!(await fs.pathExists(SCREENSHOTS_BASE_DIR))) {
      console.error(`错误: 找不到目录 ${SCREENSHOTS_BASE_DIR}`);
      return;
    }
    console.log(`开始强制统一格式 (丢弃后缀): ${SCREENSHOTS_BASE_DIR}`);
    await walkAndRename(SCREENSHOTS_BASE_DIR);
    console.log("-----------------------------------------");
    console.log("全部任务处理完毕");
  } catch (error) {
    console.error("运行失败:", error);
  }
}
