import fs from 'fs-extra';
import path from 'path';
import { app } from 'electron';
import log from 'electron-log';

export abstract class BaseAssetManager {
  protected baseDir: string;

  constructor(subDir: string) {
    this.baseDir = path.join(app.getAppPath(), 'data', subDir);
    this.ensureDir();
  }

  private ensureDir() {
    try {
      fs.ensureDirSync(this.baseDir);
    } catch (error) {
      log.error(`Failed to create asset directory ${this.baseDir}:`, error);
    }
  }

  /**
   * Get hash-based nested path for screenshots
   * @param hash - Full hash string
   * @param filename - Filename to append
   * @returns Full path like: baseDir/a1/a1b2c3d4e5/filename
   */
  protected getHashBasedPath(hash: string, filename: string): string {
    const prefix = hash.substring(0, 2);
    const hashDir = path.join(this.baseDir, prefix, hash);
    // Ensure the nested directory exists
    try {
      fs.ensureDirSync(hashDir);
    } catch (error) {
      log.error(`Failed to create hash-based directory ${hashDir}:`, error);
    }
    return path.join(hashDir, filename);
  }

  /**
   * Get flat path for covers and other assets
   * @param filename - Filename
   * @returns Full path like: baseDir/filename
   */
  protected getFlatPath(filename: string): string {
    return path.join(this.baseDir, filename);
  }

  public async saveAsset(fileName: string, data: Buffer): Promise<string> {
    const filePath = this.getFlatPath(fileName);
    try {
      await fs.writeFile(filePath, data);
      return filePath;
    } catch (error) {
      log.error(`Failed to save asset ${filePath}:`, error);
      throw error;
    }
  }

  public async getAssetPath(fileName: string): Promise<string | null> {
    const filePath = this.getFlatPath(fileName);
    if (await fs.pathExists(filePath)) {
      return filePath;
    }
    return null;
  }

  public async deleteAsset(fileName: string): Promise<void> {
    const filePath = this.getFlatPath(fileName);
    try {
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
      }
    } catch (error) {
      log.error(`Failed to delete asset ${filePath}:`, error);
    }
  }

  /**
   * List all files in a hash-based directory
   * @param hash - Full hash string
   * @returns Array of filenames
   */
  protected async listHashBasedFiles(hash: string): Promise<string[]> {
    const prefix = hash.substring(0, 2);
    const hashDir = path.join(this.baseDir, prefix, hash);
    try {
      if (await fs.pathExists(hashDir)) {
        return await fs.readdir(hashDir);
      }
      return [];
    } catch (error) {
      log.error(`Failed to list files in ${hashDir}:`, error);
      return [];
    }
  }

  /**
   * Delete a file in a hash-based directory
   * @param hash - Full hash string
   * @param filename - Filename to delete
   */
  protected async deleteHashBasedFile(hash: string, filename: string): Promise<void> {
    const filePath = this.getHashBasedPath(hash, filename);
    try {
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
      }
    } catch (error) {
      log.error(`Failed to delete hash-based file ${filePath}:`, error);
    }
  }

  /**
   * Save a file in a hash-based directory
   * @param hash - Full hash string
   * @param filename - Filename
   * @param data - File data
   * @returns Full path to saved file
   */
  protected async saveHashBasedFile(
    hash: string,
    filename: string,
    data: Buffer
  ): Promise<string> {
    const filePath = this.getHashBasedPath(hash, filename);
    try {
      await fs.writeFile(filePath, data);
      return filePath;
    } catch (error) {
      log.error(`Failed to save hash-based file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Check if a hash-based file exists
   * @param hash - Full hash string
   * @param filename - Filename
   * @returns True if file exists
   */
  protected async hashBasedFileExists(hash: string, filename: string): Promise<boolean> {
    const filePath = this.getHashBasedPath(hash, filename);
    return await fs.pathExists(filePath);
  }
}
