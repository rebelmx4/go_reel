import { app } from 'electron'

/**
 * 核心逻辑：获取并打印当前所有进程的内存占用
 */
export function printMemoryUsage(): void {
  if (!app.isReady()) return

  const metrics = app.getAppMetrics()
  console.log('\n--- [' + new Date().toLocaleTimeString() + '] 手动触发内存监控 ---')

  metrics.forEach((m) => {
    // workingSetSize 是实际占用的物理内存
    const memMB = (m.memory.workingSetSize / 1024).toFixed(2)
    console.log(`[${m.type.padEnd(15)}] | PID: ${String(m.pid).padEnd(6)} | 内存: ${memMB} MB`)
  })
  console.log('----------------------------------------------')
}

export function exposeGC(): void {
  app.commandLine.appendSwitch('js-flags', '--expose-gc')
}
