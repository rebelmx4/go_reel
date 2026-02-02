import { ipcMain } from 'electron';

// src/main/services/StoryboardService.ts
import sharp from 'sharp';
import path from 'path';
import { screenshotManager } from '../data/assets/ScreenshotManager';

export class StoryboardService {
  private readonly CANVAS_WIDTH = 1920;
  private readonly CANVAS_HEIGHT = 1080;
  // 增加边框尺寸，看起来更像真实的冲印照片
  private readonly BORDER_SIZE = 16; 

  public async generatePreview(videoPath: string): Promise<string> {
    const buffer = await this.createCollage(videoPath);
    return `data:image/webp;base64,${buffer.toString('base64')}`;
  }

  public async saveStoryboard(videoPath: string, base64Data: string): Promise<void> {
    const hash = await (screenshotManager as any).getHash(videoPath);
    const savePath = (screenshotManager as any).getFilePathInHash(hash, 'storyboard_collage.webp');
    const buffer = Buffer.from(base64Data.split(',')[1], 'base64');
    await sharp(buffer).toFile(savePath);
  }

  private async createCollage(videoPath: string): Promise<Buffer> {
    const allScreens = await screenshotManager.loadScreenshots(videoPath);
    const meta = await screenshotManager.getMetadata(videoPath);
    
    // 筛选
    const targetScreens = allScreens.filter(s => meta[s.filename]?.storyboard !== false);
    if (targetScreens.length === 0) throw new Error('没有勾选故事板图片');

    const items = targetScreens.sort(() => Math.random() - 0.5).slice(0, 15);

    // 主画布
    const canvas = sharp({
      create: {
        width: this.CANVAS_WIDTH,
        height: this.CANVAS_HEIGHT,
        channels: 4,
        background: { r: 20, g: 20, b: 20, alpha: 1 }
      }
    });

    const cols = items.length > 8 ? 4 : 3;
    const rows = Math.ceil(items.length / cols);
    const cellW = this.CANVAS_WIDTH / cols;
    const cellH = this.CANVAS_HEIGHT / rows;

    const composites: sharp.OverlayOptions[] = [];

    for (let i = 0; i < items.length; i++) {
      const screen = items[i];
      const hash = await (screenshotManager as any).getHash(videoPath);
      const filePath = (screenshotManager as any).getFilePathInHash(hash, screen.filename);

      // --- 关键修正点：处理流水线 ---
      
      const photoWidth = Math.floor(cellW * 0.75); // 基础宽度
      const randomRotation = (Math.random() - 0.5) * 26; // 随机旋转角度

      // 1. 先准备好带边框的“实体照片”
      const photoObject = await sharp(filePath)
        .rotate() // 自动纠正原始图片的旋转方向（非常重要！）
        .resize(photoWidth) // 缩放到目标大小
        .extend({ // 给图贴上白边
          top: this.BORDER_SIZE,
          bottom: this.BORDER_SIZE,
          left: this.BORDER_SIZE,
          right: this.BORDER_SIZE,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .toBuffer(); // 先导出成 Buffer，确保边框已经和图片合并成一个整体

      // 2. 将这个“带边框的整体”进行旋转
      const rotatedPhoto = await sharp(photoObject)
        .rotate(randomRotation, { 
          // 旋转后的底色必须是透明的，否则会看到黑角
          background: { r: 0, g: 0, b: 0, alpha: 0 } 
        })
        .toBuffer();

      // 3. 计算位置
      const gridX = (i % cols) * cellW;
      const gridY = Math.floor(i / cols) * cellH;
      const jitterX = (Math.random() - 0.5) * (cellW * 0.2);
      const jitterY = (Math.random() - 0.5) * (cellH * 0.2);

      composites.push({
        input: rotatedPhoto,
        left: Math.floor(gridX + (cellW - photoWidth) / 2 + jitterX),
        top: Math.floor(gridY + (cellH - photoWidth * 0.6) / 2 + jitterY),
      });
    }

    // 随机打乱层级
    composites.sort(() => Math.random() - 0.5);

    return canvas.composite(composites).webp().toBuffer();
  }
}

export const storyboardService = new StoryboardService();

export function registerStroyBoardServiceHandlers() {
  ipcMain.handle('storyboard:preview', async (_, videoPath: string) => {
  return await storyboardService.generatePreview(videoPath);
});

ipcMain.handle('storyboard:save', async (_, videoPath: string, base64: string) => {
  return await storyboardService.saveStoryboard(videoPath, base64);
});
}
