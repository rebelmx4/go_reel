/**
 * Key bindings structure from settings
 */
export interface KeyBindings {
  global: {
    view_nav: Record<string, string>;
    play_control: Record<string, string>;
    capture: Record<string, string>;
    interact: Record<string, string>;
    edit_tag: Record<string, string>;
    system: Record<string, string>;
  };
  dialog_assign_tag: {
    quick_assign_tags: Record<string, string>;
    system: Record<string, string>;
  };
}

/**
 * Action handler function
 */
type ActionHandler = () => void;

/**
 * Context-aware keyboard shortcuts manager
 * Supports multiple contexts (global, dialog_assign_tag, etc.)
 * with priority lookup: specific context → global context
 */
export class KeyBindingManager {
  private currentContext: string = 'global';
  private bindings: KeyBindings | null = null;
  private handlers: Map<string, ActionHandler> = new Map();
  private keyToAction: Map<string, Map<string, string>> = new Map();

  /**
   * Initialize with key bindings from settings
   * @param bindings Key bindings configuration
   */
  initialize(bindings: KeyBindings): void {
    this.bindings = bindings;
    this.buildKeyMaps();
  }

  /**
   * Build reverse lookup maps (key → action) for each context
   */
  private buildKeyMaps(): void {
    if (!this.bindings) return;

    // Build global context map
    const globalMap = new Map<string, string>();
    Object.values(this.bindings.global).forEach((category) => {
      Object.entries(category).forEach(([action, key]) => {
        globalMap.set(this.normalizeKey(key), action);
      });
    });
    this.keyToAction.set('global', globalMap);

    // Build dialog_assign_tag context map
    const dialogMap = new Map<string, string>();
    Object.values(this.bindings.dialog_assign_tag).forEach((category) => {
      Object.entries(category).forEach(([action, key]) => {
        dialogMap.set(this.normalizeKey(key), action);
      });
    });
    this.keyToAction.set('dialog_assign_tag', dialogMap);
  }

  /**
   * Normalize key string for consistent comparison
   * @param key Key string (e.g., "Ctrl+E", "Space", "1")
   * @returns Normalized key string
   */
  private normalizeKey(key: string): string {
    return key
      .split('+')
      .map((part) => part.trim().toLowerCase())
      .sort()
      .join('+');
  }

  /**
   * Convert keyboard event to key string
   * @param event Keyboard event
   * @returns Key string (e.g., "ctrl+e", "space", "1")
   */
  private eventToKeyString(event: KeyboardEvent): string {
    const parts: string[] = [];

    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');

    // Get the key
    let key = event.key.toLowerCase();
    
    // Handle special keys
    if (key === ' ') key = 'space';
    if (key === 'escape') key = 'esc';
    if (key === 'delete') key = 'delete';
    
    // Don't add modifier keys twice
    if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
      parts.push(key);
    }

    return parts.sort().join('+');
  }

  /**
   * Set current context
   * @param context Context name (e.g., 'global', 'dialog_assign_tag')
   */
  setContext(context: string): void {
    this.currentContext = context;
  }

  /**
   * Get current context
   * @returns Current context name
   */
  getContext(): string {
    return this.currentContext;
  }

  /**
   * Register an action handler
   * @param action Action name
   * @param handler Handler function
   */
  registerHandler(action: string, handler: ActionHandler): void {
    this.handlers.set(action, handler);
  }

  /**
   * Unregister an action handler
   * @param action Action name
   */
  unregisterHandler(action: string): void {
    this.handlers.delete(action);
  }

  /**
   * Handle keyboard event
   * @param event Keyboard event
   * @returns True if event was handled
   */
  handleKeyPress(event: KeyboardEvent): boolean {
    const keyString = this.eventToKeyString(event);

    // Try current context first
    const contextMap = this.keyToAction.get(this.currentContext);
    if (contextMap) {
      const action = contextMap.get(keyString);
      if (action) {
        const handler = this.handlers.get(action);
        if (handler) {
          event.preventDefault();
          handler();
          return true;
        }
      }
    }

    // Fallback to global context (if not already in global)
    if (this.currentContext !== 'global') {
      const globalMap = this.keyToAction.get('global');
      if (globalMap) {
        const action = globalMap.get(keyString);
        if (action) {
          const handler = this.handlers.get(action);
          if (handler) {
            event.preventDefault();
            handler();
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Clear all handlers
   */
  clearHandlers(): void {
    this.handlers.clear();
  }
}

// Export singleton instance
export const keyBindingManager = new KeyBindingManager();
