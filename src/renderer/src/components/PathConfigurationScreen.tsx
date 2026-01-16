import { useState } from 'react';
import { Container, Title, TextInput, Button, Stack, Paper, Group, Text } from '@mantine/core';
import { useNavigationStore } from '../stores';

/**
 * Path Configuration Screen Component
 * First screen shown to user to configure required paths
 */
export function PathConfigurationScreen() {
    const setView = useNavigationStore((state) => state.setView);

    const [videoSource, setVideoSource] = useState('');
    const [stagedPath, setStagedPath] = useState('');
    const [screenshotExportPath, setScreenshotExportPath] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleBrowse = async (setter: (value: string) => void) => {
        try {
            const result = await window.api.selectDirectory();
            if (result) {
                setter(result);
            }
        } catch (err) {
            console.error('Failed to select directory:', err);
        }
    };

    const handleSave = async () => {
        // Validate
        if (!videoSource || !stagedPath || !screenshotExportPath) {
            setError('请填写所有路径');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await window.api.updateConfiguration({
                videoSource,
                stagedPath,
                screenshotExportPath,
            });

            if (result.success) {
                // Switch to player view
                setView('player_page');
            } else {
                setError(result.error || '保存配置失败');
            }
        } catch (err) {
            setError('保存配置时发生错误');
            console.error('Failed to save configuration:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container size="md" style={{ paddingTop: 60 }}>
            <Paper shadow="md" p="xl" radius="md">
                <Stack gap="lg">
                    <div>
                        <Title order={2}>欢迎使用 GoReel</Title>
                        <Text c="dimmed" size="sm" mt="xs">
                            首次使用需要配置以下路径
                        </Text>
                    </div>

                    {error && (
                        <Text c="red" size="sm">
                            {error}
                        </Text>
                    )}

                    <div>
                        <Text size="sm" fw={500} mb={4}>
                            视频源目录
                        </Text>
                        <Group gap="xs">
                            <TextInput
                                style={{ flex: 1 }}
                                placeholder="选择视频文件所在目录"
                                value={videoSource}
                                onChange={(e) => setVideoSource(e.currentTarget.value)}
                            />
                            <Button onClick={() => handleBrowse(setVideoSource)}>浏览</Button>
                        </Group>
                    </div>

                    <div>
                        <Text size="sm" fw={500} mb={4}>
                            待删除/已处理 根目录
                        </Text>
                        <Group gap="xs">
                            <TextInput
                                style={{ flex: 1 }}
                                placeholder="软删除文件的存放目录"
                                value={stagedPath}
                                onChange={(e) => setStagedPath(e.currentTarget.value)}
                            />
                            <Button onClick={() => handleBrowse(setStagedPath)}>浏览</Button>
                        </Group>
                    </div>

                    <div>
                        <Text size="sm" fw={500} mb={4}>
                            截图导出目录
                        </Text>
                        <Group gap="xs">
                            <TextInput
                                style={{ flex: 1 }}
                                placeholder="截图导出的目标目录"
                                value={screenshotExportPath}
                                onChange={(e) => setScreenshotExportPath(e.currentTarget.value)}
                            />
                            <Button onClick={() => handleBrowse(setScreenshotExportPath)}>浏览</Button>
                        </Group>
                    </div>

                    <Button fullWidth size="lg" onClick={handleSave} loading={loading}>
                        保存并继续
                    </Button>
                </Stack>
            </Paper>
        </Container>
    );
}
