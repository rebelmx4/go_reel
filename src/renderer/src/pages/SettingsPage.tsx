import { useState, useEffect } from 'react';
import {
    Box,
    Text,
    Title,
    Loader,
    Paper,
    Group,
    Button,
    Tabs,
    TextInput,
    ActionIcon,
    Tooltip,
    useMantineTheme,
} from '@mantine/core';
// 【修复】确保你已经运行了: npm install @mantine/notifications
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconFolder, IconAlertCircle, IconCheck } from '@tabler/icons-react';
// 【修复】从 keyBindingManager 导入 '源头' 类型定义，确保类型一致性
import { keyBindingManager, KeyBindings } from '../utils/keyBindingManager';

// 根据 API 定义的返回类型
type AssetStatistics = {
    total_indexed_videos: string;
    total_disk_usage: string;
};

type PathOverview = {
    [key: string]: string;
};

type Conflicts = {
    [context: string]: string[];
};

export function SettingsPage() {
    const theme = useMantineTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // 三个模块的数据状态
    const [assetStats, setAssetStats] = useState<AssetStatistics | null>(null);
    const [pathOverview, setPathOverview] = useState<PathOverview | null>(null);
    const [keyBindings, setKeyBindings] = useState<KeyBindings | null>(null);

    // 快捷键相关的交互状态
    const [recordingKey, setRecordingKey] = useState<string | null>(null); // 格式: "context.group.func"
    const [conflicts, setConflicts] = useState<Conflicts>({});

    // 数据加载
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [stats, paths, bindings] = await Promise.all([
                    window.api.getAssetStatistics(),
                    window.api.getPathOverview(),
                    window.api.getKeyBindings(),
                ]);
                setAssetStats(stats);
                setPathOverview(paths);
                setKeyBindings(bindings);
                setConflicts({}); // 清空旧的冲突
            } catch (error) {
                console.error('Failed to load settings data:', error);
                notifications.show({
                    title: '错误',
                    message: '加载设置信息失败，请稍后重试。',
                    color: 'red',
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // 快捷键输入处理
    const handleShortcutKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>,
        context: string,
        group: string,
        func: string
    ) => {
        event.preventDefault();
        event.stopPropagation();

        // 【修复】明确指定 keys 数组的类型为 string[]，避免被推断为 never[]
        const keys: string[] = [];
        if (event.ctrlKey) keys.push('Ctrl');
        if (event.altKey) keys.push('Alt');
        if (event.shiftKey) keys.push('Shift');

        // 避免只记录修饰键
        if (!['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
            keys.push(event.key === ' ' ? 'Space' : event.key);
        }

        if (keys.length > 0) {
            const newShortcut = keys.join('+');
            // 使用函数式更新，确保基于最新的状态进行修改
            setKeyBindings(prev => {
                if (!prev) return null;
                const newBindings = JSON.parse(JSON.stringify(prev)); // 深拷贝以避免直接修改状态
                newBindings[context as keyof KeyBindings][group][func] = newShortcut;
                return newBindings;
            });
            setRecordingKey(null); // 录制完成，退出录制模式
            (event.target as HTMLInputElement).blur();
        }
    };

    // 保存设置
    const handleSave = async () => {
        if (!keyBindings) return;
        setIsSaving(true);
        setConflicts({}); // 清空旧的冲突标记

        try {
            const result = await window.api.saveKeyBindings(keyBindings);
            if (result.success) {
                notifications.show({
                    title: '成功',
                    message: '快捷键设置已保存并生效！',
                    color: 'teal',
                    icon: <IconCheck size={18} />,
                });
                // 【修复】updateBindings 需要完整的 KeyBindings 对象
                keyBindingManager.updateBindings(keyBindings);

            } else {
                setConflicts(result.conflicts || {});
                notifications.show({
                    title: '保存失败',
                    message: '发现快捷键冲突，请解决后再试。',
                    color: 'red',
                    icon: <IconAlertCircle size={18} />,
                });
                console.error('Key binding conflicts:', result.conflicts);
            }
        } catch (error) {
            console.error('Failed to save key bindings:', error);
            notifications.show({
                title: '错误',
                message: '保存设置时发生未知错误。',
                color: 'red',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const openFolder = async (path: string) => {
        if (!path) {
            notifications.show({
                title: '路径无效',
                message: '无法打开一个空的路径。',
                color: 'orange',
            });
            return;
        }

        try {
            const result = await window.api.openPathInExplorer(path);

            if (!result.success) {
                console.error(`打开文件夹失败: ${result.error}`);
                notifications.show({
                    title: '打开失败',
                    message: `无法打开目录: ${result.error || '未知错误'}`,
                    color: 'red',
                });
            }
        } catch (error) {
            console.error('调用 openPathInExplorer 时发生 IPC 错误:', error);
            notifications.show({
                title: '通信错误',
                message: '与主进程通信时发生错误，无法打开文件夹。',
                color: 'red',
            });
        }
    };

    // 【修复】在加载时显示 Loader 组件，提供用户反馈
    if (isLoading) {
        return (
            <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Loader />
            </Box>
        );
    }

    return (
        <Box style={{ height: '100%', overflowY: 'auto', padding: 'var(--mantine-spacing-md)' }}>
            <Title order={2} mb="xl">设置</Title>

            {/* 1. 资产统计 */}
            <Paper shadow="xs" p="md" mb="xl">
                <Title order={4} mb="sm">资产统计</Title>
                {assetStats && (
                    <Group>
                        <Text>已索引视频总数: <b>{assetStats.total_indexed_videos}</b></Text>
                        <Text>累计磁盘占用: <b>{assetStats.total_disk_usage}</b></Text>
                    </Group>
                )}
            </Paper>

            {/* 2. 路径概览 */}
            <Paper shadow="xs" p="md" mb="xl">
                <Title order={4} mb="md">路径概览 (只读)</Title>
                {pathOverview && Object.entries(pathOverview).map(([key, value]) => (
                    <Group key={key} justify="space-between" mb="xs">
                        <Text size="sm"><b>{key}:</b> {value}</Text>
                        <Tooltip label="在文件浏览器中打开">
                            <ActionIcon variant="subtle" onClick={() => openFolder(value)}>
                                <IconFolder size={18} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                ))}
            </Paper>

            {/* 3. 快捷键配置 */}
            <Paper shadow="xs" p="md" mb="xl">
                <Title order={4} mb="sm">快捷键配置</Title>
                {keyBindings && (
                    <Tabs defaultValue={Object.keys(keyBindings)[0]}>
                        <Tabs.List>
                            {Object.keys(keyBindings).map(context => (
                                <Tabs.Tab key={context} value={context} rightSection={
                                    conflicts[context] && (
                                        <IconAlertCircle size={14} style={{ color: theme.colors.red[6] }} />
                                    )
                                }>
                                    {context}
                                </Tabs.Tab>
                            ))}
                        </Tabs.List>

                        {/* 遍历每一个快捷键上下文 (context)，例如 'global' */}
                        {Object.entries(keyBindings).map(([context, groups]) => (
                            <Tabs.Panel key={context} value={context} pt="md">
                                {/* 遍历该上下文下的所有功能分组 (group)，例如 'play_control' */}
                                {Object.entries(groups).map(([group, funcs]) => (
                                    <Box key={group} mb="md">
                                        <Text size="sm" fw={700} mb="xs">{group}</Text>
                                        {/* 
                          【修复】
                          我们在这里对 Object.entries 的结果进行一次类型断言。
                          将其断言为一个 entry 数组，其中键是字符串，值是我们期望的嵌套对象结构。
                          这次断言会修正所有后续的类型推断，一劳永逸地解决所有 'unknown' 问题。
                        */}
                                        {(Object.entries(keyBindings) as [string, Record<string, Record<string, string>>][]).map(([context, groups]) => (
                                            <Tabs.Panel key={context} value={context} pt="md">
                                                {/* 
                                  由于上面的断言，'groups' 现在被正确地推断为 Record<string, Record<string, string>>
                                  所以这里的 Object.entries(groups) 不会再报错。
                                */}
                                                {Object.entries(groups).map(([group, funcs]) => (
                                                    <Box key={group} mb="md">
                                                        <Text size="sm" fw={700} mb="xs">{group}</Text>
                                                        {/* 
                                          同样，'funcs' 现在被正确推断为 Record<string, string>。
                                          因此，'shortcut' 也会被正确推断为 string，不再需要内部的类型守卫。
                                        */}
                                                        {Object.entries(funcs).map(([func, shortcut]) => {
                                                            const id = `${context}.${group}.${func}`;
                                                            const hasConflict = conflicts[context]?.includes(func);

                                                            return (
                                                                <Group key={func} justify="space-between" mb={4}>
                                                                    <Text size="sm">{func}</Text>
                                                                    <TextInput
                                                                        style={{ width: 200 }}
                                                                        readOnly
                                                                        value={shortcut}
                                                                        placeholder={recordingKey === id ? '请按下快捷键...' : shortcut}
                                                                        onFocus={() => {
                                                                            setRecordingKey(id);
                                                                            setConflicts({});
                                                                        }}
                                                                        onBlur={() => setRecordingKey(null)}
                                                                        onKeyDown={(e) => handleShortcutKeyDown(e, context, group, func)}
                                                                        error={!!hasConflict}
                                                                    />
                                                                </Group>
                                                            );
                                                        })}
                                                    </Box>
                                                ))}
                                            </Tabs.Panel>
                                        ))}
                                    </Box>
                                ))}
                            </Tabs.Panel>
                        ))}
                    </Tabs>
                )}
            </Paper>

            <Group justify="flex-end" mt="xl">
                <Button
                    leftSection={<IconDeviceFloppy size={18} />}
                    onClick={handleSave}
                    loading={isSaving}
                >
                    保存设置
                </Button>
            </Group>
        </Box>
    );
}