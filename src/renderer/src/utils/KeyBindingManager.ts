/**
 * @file keyBindingManager.ts
 * @description 管理应用程序的所有键盘快捷键。
 * 它具备上下文感知能力，并且可以在设置更改时动态更新。
 */

/**
 * 描述从 settings.json 加载的快捷键配置的结构。
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
  // 未来如果需要，可在此处添加其他上下文
}

/**
 * 定义动作处理器函数的签名。
 */
type ActionHandler = () => void;

/**
 * 一个具备上下文感知能力的键盘快捷键管理器。
 *
 * 此类维护一个从键盘组合键到特定动作的映射。
 * 它支持不同的“上下文”（例如 'global', 'dialog_assign_tag'），允许同一个按键
 * 根据应用状态执行不同的动作。它遵循一个回退机制：如果一个按键在当前
 * 上下文中未被处理，它会检查 'global' 全局上下文。
 */
export class KeyBindingManager {
  private currentContext: string = 'global';
  private bindings: KeyBindings | null = null;
  private handlers: Map<string, ActionHandler> = new Map();
  
  // 一个用于高效查找的嵌套 Map：上下文 -> (规范化快捷键 -> 动作)
  private keyToAction: Map<string, Map<string, string>> = new Map();

  /**
   * 使用快捷键配置初始化管理器。
   * 此方法应在应用启动时调用一次。
   * @param bindings 来自设置的快捷键配置。
   */
  public initialize(bindings: KeyBindings): void {
    this.updateBindings(bindings);
  }

   /**
   * [新增] 获取当前加载的快捷键绑定配置。
   * 主要用于在 UI 中动态显示快捷键。
   * @returns 当前的 KeyBindings 对象，或在未初始化时返回 null。
   */
  public getBindings(): KeyBindings | null {
    return this.bindings;
  }

  /**
   * 使用新的快捷键配置更新管理器。
   * 当设置发生更改时，可以随时调用此方法以立即应用更改。
   * @param bindings 新的快捷键配置。
   */
  public updateBindings(bindings: KeyBindings): void {
    this.bindings = bindings;
    this.keyToAction.clear(); // 移除所有旧的映射
    this.buildKeyMaps();      // 从新的配置重新创建映射
    console.log('KeyBindingManager 已使用新的快捷键绑定进行更新。');
  }

  /**
   * 设置当前的活动上下文。
   * @param context 上下文名称 (例如 'global', 'dialog_assign_tag')。
   */
  public setContext(context: string): void {
    this.currentContext = context;
  }

  /**
   * 获取当前的活动上下文。
   * @returns 当前上下文的名称。
   */
  public getContext(): string {
    return this.currentContext;
  }

  /**
   * 注册一个当特定动作被触发时调用的函数。
   * @param action 动作名称 (例如 'toggle_play', 'list_history')。
   * @param handler 要执行的函数。
   */
  public registerHandler(action: string, handler: ActionHandler): void {
    this.handlers.set(action, handler);
  }

  /**
   * 移除一个已注册的动作处理器。
   * @param action 要注销的动作名称。
   */
  public unregisterHandler(action: string): void {
    this.handlers.delete(action);
  }

  /**
   * 处理一个键盘事件，找到对应的动作，并执行其处理器。
   * @param event DOM 键盘事件。
   * @returns 如果事件被处理则返回 `true`，否则返回 `false`。
   */
  public handleKeyPress(event: KeyboardEvent): boolean {
    if (!this.bindings) return false;

    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return false;
    }

    // 2. 核心修改：拦截长按重复触发 (解决你不停截图的问题)
    if (event.repeat) {
      return false;
    }

    const keyString = this.eventToKeyString(event);

    // 1. 尝试在当前上下文中查找并执行动作
    const contextMap = this.keyToAction.get(this.currentContext);
    if (contextMap) {
      const action = contextMap.get(keyString);
      if (action && this.executeHandler(action)) {
        event.preventDefault(); // 阻止事件的默认行为 (如浏览器后退)
        event.stopPropagation(); // 防止事件继续冒泡
        return true;
      }
    }

    // 2. 如果未处理且当前不在全局上下文，则回退到 'global' 上下文
    if (this.currentContext !== 'global') {
      const globalMap = this.keyToAction.get('global');
      if (globalMap) {
        const action = globalMap.get(keyString);
        if (action && this.executeHandler(action)) {
          event.preventDefault();
          event.stopPropagation(); // 防止事件继续冒泡
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 清除所有已注册的动作处理器。在组件清理时很有用。
   */
  public clearHandlers(): void {
    this.handlers.clear();
  }
  
  /**
   * 如果存在给定动作的处理器，则执行它。
   * @param action 动作的名称。
   * @returns 如果找到并执行了处理器则返回 `true`，否则返回 `false`。
   */
  private executeHandler(action: string): boolean {
    const handler = this.handlers.get(action);
    if (handler) {
      handler();
      return true;
    }
    return false;
  }

  /**
   * 遍历原始绑定数据，并构建反向查找映射表 (快捷键 -> 动作)。
   */
  private buildKeyMaps(): void {
    if (!this.bindings) return;

    for (const context in this.bindings) {
      const contextMap = new Map<string, string>();
      const contextGroups = this.bindings[context as keyof KeyBindings];
      
      for (const group in contextGroups) {
        const actions = contextGroups[group as keyof typeof contextGroups];
        for (const action in actions) {
          const key = actions[action];
          if (key) { // 确保快捷键不为空
            contextMap.set(this.normalizeKey(key), action);
          }
        }
      }
      this.keyToAction.set(context, contextMap);
    }
  }

  /**
   * 将快捷键字符串规范化为一致的格式。
   * 示例: " Shift + a + Ctrl " -> "a+ctrl+shift"
   * @param key 原始快捷键字符串。
   * @returns 规范化后的字符串。
   */
  private normalizeKey(key: string): string {
    return key
      .split('+')
      .map((part) => part.trim().toLowerCase())
      .sort()
      .join('+');
  }

  /**
   * 将一个 KeyboardEvent 对象转换为一个规范化的快捷键字符串。
   * @param event DOM 键盘事件。
   * @returns 代表按键组合的规范化字符串。
   */
  private eventToKeyString(event: KeyboardEvent): string {
    const parts: string[] = [];
    
    // 为跨平台兼容性，将 Mac 上的 Command (metaKey) 键映射为 ctrl
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');

    let key = event.key.toLowerCase();
    
    // 规范化特殊按键的名称
    if (key === ' ') key = 'space';
    if (key === 'escape') key = 'esc';
    
    // 仅当主键不是修饰键本身时才添加
    if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
      parts.push(key);
    }

    // 排序以确保顺序一致 (例如, Ctrl+Shift+A 和 Shift+Ctrl+A 相同)
    return parts.sort().join('+');
  }
}

/**
 * 一个 `KeyBindingManager` 的单例实例，供整个应用程序使用。
 */
export const keyBindingManager = new KeyBindingManager();