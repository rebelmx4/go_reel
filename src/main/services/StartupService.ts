import { SettingsManager } from '../data/json/SettingsManager';
import { Annotation, AnnotationManager } from '../data/json/AnnotationManager';
import { HistoryManager } from '../data/json/HistoryManager';
import { scanVideoFiles, getNewestVideos, ScanResult } from '../utils/fileScanner';
import log from 'electron-log';

/**
 * Startup result returned by the startup service
 */
export interface StartupResult {
  needsConfiguration: boolean; // True if user needs to configure paths
  videoList?: ScanResult[]; // All scanned videos
  playlists?: {
    all: ScanResult[]; // Random playlist (all videos)
    newest: ScanResult[]; // Top 100 newest videos
    recent: string[]; // Recent history (filtered)
    favorites: string[]; // Favorite videos (hash list)
    liked: string[]; // Liked videos (hash list)
  };
  initialVideo?: ScanResult; // First video to load
  volume?: number; // Restored volume
}

/**
 * Startup service orchestrating the four-phase startup process
 */
export class StartupService {
  constructor(
    private settingsManager: SettingsManager,
    private annotationManager: AnnotationManager,
    private historyManager: HistoryManager
  ) {}

  
  async firstStartup(): Promise<StartupResult> {
      await this.settingsManager.load()
      await this.annotationManager.load()
      await this.historyManager.load()

      return this.startup()
  }

  /**
   * Execute the complete startup flow
   * @returns Startup result
   */
  async startup(): Promise<StartupResult> {
    log.info('=== Starting application startup ===');

     // Phase 1: Configuration Check
    const configValid = await this.checkConfiguration();
    if (!configValid) {
      log.warn('Configuration incomplete. User needs to configure paths.');
      return { needsConfiguration: true };
    }
    
    // Phase 2: Lightweight File Scanning
    const videoList = await this.scanFiles();
    if (videoList.length === 0) {
      log.warn('No video files found in source directory.');
      return {
        needsConfiguration: false,
        videoList: [],
        playlists: {
          all: [],
          newest: [],
          recent: [],
          favorites: Array<[string, Annotation]>,
          liked: Array<[string, Annotation]>,
        },
      };
    }

    // Phase 3: Data Loading & List Building
    const playlists = await this.buildPlaylists(videoList);

    // Phase 4: State Restoration
    const initialVideo = this.selectInitialVideo(playlists.all);
    const volume = this.settingsManager.getGlobalVolume();

    log.info('=== Startup complete ===');
    log.info(`Total videos: ${videoList.length}`);
    log.info(`Random playlist: ${playlists.all.length}`);
    log.info(`Newest playlist: ${playlists.newest.length}`);
    log.info(`Recent playlist: ${playlists.recent.length}`);
    log.info(`Favorites: ${playlists.favorites.length}`);
    log.info(`Liked: ${playlists.liked.length}`);

    return {
      needsConfiguration: false,
      videoList,
      playlists,
      initialVideo,
      volume,
    };
  }

  /**
   * Phase 1: Check if all required paths are configured
   * @returns True if configuration is valid
   */
  private async checkConfiguration(): Promise<boolean> {
    log.info('Phase 1: Configuration check');

    const videoSource = this.settingsManager.getVideoSourcePath();
    const staged_path = this.settingsManager.getStagedPath();
    const screenshotExportPath = this.settingsManager.getScreenshotExportPath();

    // Check if any required path is empty
    if (
      !videoSource ||
      !staged_path ||
      !screenshotExportPath
    ) {
      log.warn('Missing required paths in configuration');
      log.warn(`Video source: ${videoSource || '(empty)'}`);
      log.warn(`Processed: ${staged_path || '(empty)'}`);
      log.warn(`Screenshot export: ${screenshotExportPath || '(empty)'}`);
      return false;
    }

    log.info('Configuration valid');
    return true;
  }

  /**
   * Phase 2: Scan video files (lightweight - only path and creation time)
   * @returns Array of scanned videos
   */
  private async scanFiles(): Promise<ScanResult[]> {
    log.info('Phase 2: Lightweight file scanning');

    const videoSource = this.settingsManager.getVideoSourcePath();
    const staged_path = this.settingsManager.getStagedPath();
    const screenshot = this.settingsManager.getScreenshotExportPath()  

    // Build blacklist (directories to skip)
    const blacklist = [staged_path, screenshot].filter(Boolean);

    log.info(`Scanning directory: ${videoSource}`);
    log.info(`Blacklist: ${blacklist.join(', ')}`);

    const videoList = await scanVideoFiles(videoSource, []);

    log.info(`Found ${videoList.length} video files`);
    return videoList;
  }

  /**
   * Phase 3: Load data files and build playlists
   * @param videoList Scanned video list
   * @returns Playlists
   */
  private async buildPlaylists(videoList: ScanResult[]): Promise<{
    all: ScanResult[];
    newest: ScanResult[];
    recent: string[];
    favorites: Array<[string, Annotation]>;
    liked: Array<[string, Annotation]>;
  }> {
    log.info('Phase 3: Data loading and list building');

    // Build random playlist (all videos)
    const all = [...videoList];

    // Build newest playlist (top 100 by creation time)
    const newest = getNewestVideos(videoList, 100);

    // Build recent playlist (filter out non-existent files)
    const recentHistory = this.historyManager.getHistory();
    const videoPathSet = new Set(videoList.map((v) => v.path));
    const recent = recentHistory.filter((path) => videoPathSet.has(path));

    // Build favorites playlist (from metadata)
    const favorites = this.annotationManager.getFavorites();
    const liked = this.annotationManager.getByLikeCount(0);


    return {
      all,
      newest,
      recent,
      favorites,
      liked,
    };
  }

  /**
   * Phase 4: Select initial video from random playlist
   * @param randomPlaylist Random playlist
   * @returns Initial video or undefined
   */
  private selectInitialVideo(randomPlaylist: ScanResult[]): ScanResult | undefined {
    log.info('Phase 4: State restoration');

    if (randomPlaylist.length === 0) {
      log.warn('No videos in random playlist');
      return undefined;
    }

    // Select random video
    const randomIndex = Math.floor(Math.random() * randomPlaylist.length);
    const initialVideo = randomPlaylist[randomIndex];

    log.info(`Selected initial video: ${initialVideo.path}`);
    return initialVideo;
  }
}
