/**
 * @file KeyBindingManager.ts
 * @description 管理应用程序的所有键盘快捷键。
 */

// 1. 导入新的类型定义
import { KeyBindingsConfig, AppAction } from '../../../shared/settings.schema';

/**
 * 定义动作处理器函数的签名。
 */
type ActionHandler = () => void;

/**
 * 一个具备上下文感知能力的键盘快捷键管理器。
 */
export class KeyBindingManager {
  private currentContext: string = 'global';
  // 2. 使用导入的 KeyBindingsConfig 替换旧接口
  private bindings: KeyBindingsConfig | null = null;
  
  // 3. 将动作名类型改为 AppAction 以获得更好的类型提示（逻辑上依然是 string）
  private handlers: Map<AppAction, ActionHandler> = new Map();
  
  // 查找映射表：上下文 -> (规范化快捷键 -> 动作名)
  private keyToAction: Map<string, Map<string, AppAction>> = new Map();

   constructor() {
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }

  /**
   * 启动管理器
   * @param bindings 对应 settings.key_bindings
   */
  public bootstrap(bindings: KeyBindingsConfig): void {
    this.updateBindings(bindings);
    window.addEventListener('keydown', this.handleKeyPress);
    console.log('KeyBindingManager: Bootstrapped and listening.');
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyPress);
    this.handlers.clear();
  }

  /**
   * 获取当前加载的快捷键绑定配置
   */
  public getBindings(): KeyBindingsConfig | null {
    return this.bindings;
  }

  /**
   * 更新快捷键配置
   */
  public updateBindings(bindings: KeyBindingsConfig): void {
    this.bindings = bindings;
    this.keyToAction.clear(); 
    this.buildKeyMaps();
    console.log('KeyBindingManager 已更新。');
  }

  public setContext(context: string): void {
    this.currentContext = context;
  }

  public getContext(): string {
    return this.currentContext;
  }

  /**
   * 注册动作处理器
   */
  public registerHandler(action: AppAction, handler: ActionHandler): void {
    this.handlers.set(action, handler);
  }

  /**
   * 批量注册动作处理器
   */
  public registerHandlers(handlersMap: Record<AppAction | string, ActionHandler>): void {
    Object.entries(handlersMap).forEach(([action, handler]) => {
      this.registerHandler(action as AppAction, handler);
    });
  }

  public unregisterHandler(action: AppAction): void {
    this.handlers.delete(action);
  }

  public unregisterHandlers(actions: AppAction[]): void {
    actions.forEach((action) => {
      this.unregisterHandler(action);
    });
  }

  /**
   * 处理键盘事件 (核心逻辑未变)
   */
  public handleKeyPress(event: KeyboardEvent): boolean {
    if (!this.bindings) return false;

    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return false;
    }

    if (event.repeat) {
      return false;
    }

    const keyString = this.eventToKeyString(event);

    // 1. 尝试在当前上下文中查找
    const contextMap = this.keyToAction.get(this.currentContext);
    if (contextMap) {
      const action = contextMap.get(keyString);
      if (action && this.executeHandler(action)) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
    }

    // 2. 回退到 'global' 上下文
    if (this.currentContext !== 'global') {
      const globalMap = this.keyToAction.get('global');
      if (globalMap) {
        const action = globalMap.get(keyString);
        if (action && this.executeHandler(action)) {
          event.preventDefault();
          event.stopPropagation();
          return true;
        }
      }
    }

    return false;
  }

  public clearHandlers(): void {
    this.handlers.clear();
  }
  
  private executeHandler(action: AppAction): boolean {
    const handler = this.handlers.get(action);
    if (handler) {
      handler();
      return true;
    }
    return false;
  }

  /**
   * 解析数据结构并构建映射表 (逻辑保持 3 层遍历)
   */
  private buildKeyMaps(): void {
    if (!this.bindings) return;

    // 遍历 Context (global, dialog_assign_tag)
    for (const contextKey in this.bindings) {
      const contextMap = new Map<string, AppAction>();
      const contextObj = this.bindings[contextKey as keyof KeyBindingsConfig];
      
      // 遍历 Group (view_nav, play_control, quick_assign_tags 等)
      for (const groupKey in contextObj) {
        const groupObj = (contextObj as any)[groupKey];
        
        // 遍历具体的 Action (toggle_play, slot_1 等)
        for (const actionKey in groupObj) {
          const keyString = groupObj[actionKey];
          if (keyString && typeof keyString === 'string') {
            // 存储规范化后的键位映射
            contextMap.set(this.normalizeKey(keyString), actionKey as AppAction);
          }
        }
      }
      this.keyToAction.set(contextKey, contextMap);
    }
  }

  private normalizeKey(key: string): string {
    return key
      .split('+')
      .map((part) => part.trim().toLowerCase())
      .sort()
      .join('+');
  }

  private eventToKeyString(event: KeyboardEvent): string {
    const parts: string[] = [];
    
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');

    let key = event.key.toLowerCase();
    
    if (key === ' ') key = 'space';
    if (key === 'escape') key = 'esc';
    
    if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
      parts.push(key);
    }

    return parts.sort().join('+');
  }
}

export const keyBindingManager = new KeyBindingManager();