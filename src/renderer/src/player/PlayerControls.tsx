import { Group, ActionIcon, Tooltip, Box, Button, Slider, Menu } from '@mantine/core'
import {
  IconPlayerSkipForward,
  IconCamera,
  IconArrowRight,
  IconColumns3,
  IconTrash,
  IconRotateClockwise,
  IconStar,
  IconStarFilled,
  IconMagnet,
  IconPlayerSkipBack,
  IconTransform,
  IconTag,
  IconThumbDown,
  IconThumbUp,
  IconDots
} from '@tabler/icons-react'
import {
  usePlayerStore,
  useVideoFileRegistryStore,
  usePlaylistStore,
  useNavigationStore
} from '../stores'
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { ProgressBarWithThumbnail } from './ProgressBarWithThumbnail'
import { ScreenshotTrack } from './scrreenshotsTrack/ScreenshotTrack'
import { keyBindingManager } from '@renderer/utils'
import { PlaybackTimeLabel } from './PlaybackTimeLabel'
import { useVideoContext } from './contexts'
import { STEP_OPTIONS } from '../../../shared'
import { formatPlaybackStep } from '../utils/format'
import { IconScissors } from '@tabler/icons-react'
import { useMultiPlayerStore } from '../stores/multiPlayerStore'
import { IconLayoutGridAdd } from '@tabler/icons-react'
import { IconSettingsAutomation } from '@tabler/icons-react'

/**
 * 防抖 Hook 用于持久化设置
 */
function useDebouncedEffect(callback: () => void, delay: number, deps: React.DependencyList): void {
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(callback, delay)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [...deps, callback, delay])
}

interface PlayerControlsProps {
  onScreenshot: () => void
  onNext: () => void
  onRotate: () => void
  onDelete: () => void
  onToggleFavorite: () => void
  onHandleTranscode: () => void
  onToggleLike: (isCtrl: boolean) => void // <--- 新增这一行
}

export function PlayerControls({
  onScreenshot,
  onNext,
  onRotate,
  onDelete,
  onToggleFavorite,
  onHandleTranscode,
  onToggleLike
}: PlayerControlsProps) {
  const { videoRef } = useVideoContext()

  // --- 1. Store 数据订阅 ---
  // 状态值
  const volume = usePlayerStore((state) => state.volume)
  const skipFrameMode = usePlayerStore((state) => state.skipFrameMode)

  // 方法 (Actions 通常是静态的，不会触发重绘)
  const setVolume = usePlayerStore((state) => state.setVolume)
  const setSkipFrameMode = usePlayerStore((state) => state.setSkipFrameMode)
  const historyPaths = usePlaylistStore((state) => state.historyPaths)
  const isHoverSeekMode = usePlayerStore((state) => state.isHoverSeekMode)
  const setHoverSeekMode = usePlayerStore((state) => state.setHoverSeekMode)
  const historyIndex = usePlaylistStore((state) => state.historyIndex)
  const prev = usePlaylistStore((state) => state.prev)

  const showClipTrack = usePlayerStore((state) => state.showClipTrack)
  const toggleClipTrack = usePlayerStore((state) => state.toggleClipTrack)

  const stepMode = usePlayerStore((state) => state.stepMode)
  const setStepMode = usePlayerStore((state) => state.setStepMode)

  const currentPath = usePlaylistStore((state) => state.currentPath)

  const videoFile = useVideoFileRegistryStore(
    useCallback((state) => (currentPath ? state.videos[currentPath] : null), [currentPath])
  )

  const canPrev = historyIndex < historyPaths.length - 1

  const showViewportTags = usePlayerStore((state) => state.showViewportTags)
  const toggleViewportTags = usePlayerStore((state) => state.toggleViewportTags)

  // --- 2. 状态派生 (不再需要 useState) ---
  const isFavorite = videoFile?.annotation?.is_favorite || false
  const [keyMap, setKeyMap] = useState<Record<string, string>>({})

  const setView = useNavigationStore((state) => state.setView)

  // 加载快捷键配置 (逻辑不变)
  useEffect(() => {
    const bindings = keyBindingManager.getBindings()
    if (bindings) {
      const map: Record<string, string> = {}
      Object.values(bindings.global).forEach((group) => {
        Object.entries(group).forEach(([action, key]) => {
          map[action] = key as string
        })
      })
      setKeyMap(map)
    }
  }, [])

  const handleSeek = (value: number): void => {
    if (videoRef.current) videoRef.current.currentTime = value
  }

  // 持久化音量
  useDebouncedEffect(
    () => {
      window.api.updatePreferenceSettings({ playback: { global_volume: volume } })
    },
    1000,
    [volume]
  )

  const getTooltipLabel = (baseLabel: string, action: string): string => {
    const key = keyMap[action]
    return key ? `${baseLabel} (${key})` : baseLabel
  }

  const duration = usePlayerStore((state) => state.duration)
  const isSkipDisabled = duration < 60

  // 找到点赞/喜欢按钮的位置
  const score = videoFile?.annotation?.like_count ?? 0

  // 计算 UI 状态
  const displayScore = Math.floor(Math.abs(score)) // 取绝对值向下取整
  const isPositive = score > 0
  const isNegative = score < 0

  return (
    <Box
      style={{
        padding: '8px 16px',
        backgroundColor: 'rgba(20, 20, 20, 0.98)',
        borderTop: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }}
    >
      <ScreenshotTrack onScreenshotClick={(ts) => handleSeek(ts / 1000)} />

      {/* 第一行：进度条、时间、切换按钮 */}
      <Group gap="md" align="center" wrap="nowrap" style={{ height: 32 }}>
        <Box style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <ProgressBarWithThumbnail videoPath={currentPath || ''} onSeek={handleSeek} />
        </Box>

        <PlaybackTimeLabel />

        <Group gap={4} wrap="nowrap">
          <Tooltip label="上一个 (历史回退)">
            <ActionIcon variant="subtle" color="gray" size="md" onClick={prev} disabled={!canPrev}>
              <IconPlayerSkipBack size={18} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="下一个">
            <ActionIcon variant="subtle" color="gray" size="md" onClick={onNext}>
              <IconPlayerSkipForward size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* 第二行：主要控制按钮 */}
      <Group justify="space-between" align="center">
        <Group gap="xs">
          {/* 收藏 */}
          <Tooltip label={getTooltipLabel(isFavorite ? '移出精品' : '加入精品', 'toggle_favorite')}>
            <ActionIcon
              variant="subtle"
              color={isFavorite ? 'yellow' : 'gray'}
              onClick={onToggleFavorite}
              disabled={!currentPath}
            >
              {isFavorite ? <IconStarFilled size={20} /> : <IconStar size={20} />}
            </ActionIcon>
          </Tooltip>

          {/* 点赞/踩 */}
          <Tooltip label={`点赞 (Ctrl+点击是不喜欢) | 当前分数: ${score.toFixed(1)}`}>
            <ActionIcon
              variant={score !== 0 ? 'filled' : 'subtle'}
              color={isNegative ? 'blue.8' : isPositive ? 'red.6' : 'gray'}
              onClick={(e) => onToggleLike(e.ctrlKey)}
              style={{ position: 'relative' }}
            >
              {isNegative ? <IconThumbDown size={20} /> : <IconThumbUp size={20} />}
              {displayScore > 0 && (
                <Box
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: 'white',
                    color: 'black',
                    borderRadius: '10px',
                    fontSize: '9px',
                    padding: '0 4px',
                    fontWeight: 'bold',
                    border: '1px solid #ccc',
                    lineHeight: '12px'
                  }}
                >
                  {displayScore}
                </Box>
              )}
            </ActionIcon>
          </Tooltip>

          {/* 视口标签 */}
          <Tooltip label={showViewportTags ? '隐藏视口标签' : '显示视口标签'}>
            <ActionIcon
              variant={showViewportTags ? 'filled' : 'subtle'}
              color={showViewportTags ? 'blue' : 'gray'}
              onClick={toggleViewportTags}
            >
              <IconTag size={20} />
            </ActionIcon>
          </Tooltip>

          {/* 步进单位选择 */}
          <Menu shadow="md" width={100} position="top" withArrow>
            <Menu.Target>
              <Button
                variant="light"
                color="gray"
                size="compact-xs"
                styles={{ label: { fontSize: '11px' } }}
              >
                {formatPlaybackStep(stepMode)}
              </Button>
            </Menu.Target>
            <Menu.Dropdown style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
              <Menu.Label>步进单位</Menu.Label>
              {STEP_OPTIONS.map((option) => (
                <Menu.Item
                  key={option}
                  onClick={() => setStepMode(option)}
                  style={{
                    fontSize: '12px',
                    color: stepMode === option ? '#228be6' : '#eee',
                    backgroundColor: stepMode === option ? 'rgba(34, 139, 230, 0.1)' : 'transparent'
                  }}
                >
                  {formatPlaybackStep(option)}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>

          {/* 更多功能菜单 */}
          <Menu shadow="md" width={200} position="top-start" withArrow>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDots size={20} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
              <Menu.Label>操作</Menu.Label>
              <Menu.Item leftSection={<IconCamera size={16} />} onClick={onScreenshot}>
                截图
              </Menu.Item>
              <Menu.Item leftSection={<IconRotateClockwise size={16} />} onClick={onRotate}>
                旋转视频
              </Menu.Item>
              <Menu.Item
                leftSection={
                  skipFrameMode ? <IconColumns3 size={16} /> : <IconArrowRight size={16} />
                }
                onClick={() => setSkipFrameMode(!skipFrameMode)}
                disabled={isSkipDisabled}
                color={skipFrameMode ? 'blue' : undefined}
              >
                {skipFrameMode ? '退出跳帧模式' : '进入跳帧模式'}
              </Menu.Item>
              <Menu.Item
                leftSection={<IconScissors size={16} />}
                onClick={toggleClipTrack}
                color={showClipTrack ? 'blue' : undefined}
              >
                {showClipTrack ? '关闭裁剪轨道' : '打开裁剪轨道'}
              </Menu.Item>
              <Menu.Item
                leftSection={<IconMagnet size={16} />}
                onClick={() => setHoverSeekMode(!isHoverSeekMode)}
                color={isHoverSeekMode ? 'orange' : undefined}
              >
                {isHoverSeekMode ? '关闭磁吸预览' : '开启磁吸预览'}
              </Menu.Item>
              <Menu.Item leftSection={<IconTransform size={16} />} onClick={onHandleTranscode}>
                兼容性转码
              </Menu.Item>

              <Menu.Divider />
              <Menu.Label>管理</Menu.Label>
              <Menu.Item
                leftSection={<IconLayoutGridAdd size={16} />}
                onClick={() => currentPath && useMultiPlayerStore.getState().addPath(currentPath)}
              >
                添加到多窗口
              </Menu.Item>
              <Menu.Item
                leftSection={<IconSettingsAutomation size={16} />}
                onClick={() => setView('screenshot_manage_page')}
              >
                管理本片截图
              </Menu.Item>
              <Menu.Item leftSection={<IconTrash size={16} />} color="red" onClick={onDelete}>
                移动到回收站
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        <Group gap="lg">
          {/* 音量 */}
          <Group gap="xs">
            <Slider
              value={volume}
              onChange={setVolume}
              style={{ width: 80 }}
              size="xs"
              color="blue"
            />
          </Group>
        </Group>
      </Group>
    </Box>
  )
}
