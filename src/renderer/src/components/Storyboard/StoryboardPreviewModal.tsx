import { Modal, Image, Button, Group, Stack, Center, Loader, Box } from '@mantine/core';
import { IconRefresh, IconCheck } from '@tabler/icons-react';

export function StoryboardPreviewModal({ url, onCancel, onSave, onRegenerate, loading }: any) {
    return (
        <Modal
            opened={!!url || loading}
            onClose={onCancel}
            size="70%"
            title="故事板照片墙预览"
            centered
            overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
        >
            <Stack>
                <Box style={{ position: 'relative', minHeight: 400, backgroundColor: '#1a1a1a', borderRadius: 8, overflow: 'hidden' }}>
                    {loading ? (
                        <Center style={{ position: 'absolute', inset: 0 }}>
                            <Loader size="lg" />
                        </Center>
                    ) : (
                        <Image src={url} radius="md" />
                    )}
                </Box>

                <Group justify="flex-end">
                    <Button variant="light" color="gray" onClick={onCancel}>取消</Button>
                    <Button variant="outline" leftSection={<IconRefresh size={16} />} onClick={onRegenerate} loading={loading}>
                        重新生成
                    </Button>
                    <Button color="green" leftSection={<IconCheck size={16} />} onClick={onSave} disabled={loading}>
                        保存到目录
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}