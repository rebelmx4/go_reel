import log from 'electron-log'

/**
 * 通用的安全 IPC 包装器
 * @param action 业务逻辑执行函数
 * @param fallbackValue 出错时的返回值
 */
export async function safeInvoke<T>(action: () => Promise<T>, fallbackValue: T): Promise<T> {
  try {
    return await action()
  } catch (error) {
    // 统一在这里记录错误日志，不用到处写 console.error
    log.error(`[IPC Handler Error]:`, error)
    return fallbackValue
  }
}
