// src/renderer/src/player/components/TagCropView.tsx
import { useState } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Box, Button, Group } from '@mantine/core';
import { IconAspectRatio, IconMaximize } from '@tabler/icons-react';

interface TagCropViewProps {
    src: string;
    onConfirm: (croppedBase64: string) => void;
}

export function TagCropView({ src, onConfirm }: TagCropViewProps) {
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [aspect, setAspect] = useState<number | undefined>(undefined);

    const handleConfirm = () => {
        const targetCrop = completedCrop;
        const img = document.getElementById('crop-target-img') as HTMLImageElement;
        if (!img) return;

        const canvas = document.createElement('canvas');
        const scaleX = img.naturalWidth / img.width;
        const scaleY = img.naturalHeight / img.height;

        // 如果没有选区(targetCrop)，则裁剪全图
        const cropX = targetCrop ? targetCrop.x * scaleX : 0;
        const cropY = targetCrop ? targetCrop.y * scaleY : 0;
        const cropW = targetCrop ? targetCrop.width * scaleX : img.naturalWidth;
        const cropH = targetCrop ? targetCrop.height * scaleY : img.naturalHeight;

        canvas.width = cropW;
        canvas.height = cropH;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
            onConfirm(canvas.toDataURL('image/jpeg', 0.9));
        }
    };

    return (
        <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '500px' }}>
            <Box style={{
                flex: 1,
                padding: '20px',
                backgroundColor: '#0a0a0a',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden'
            }}>
                <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspect}
                    style={{ maxWidth: '100%', maxHeight: '70vh' }}
                >
                    <img
                        id="crop-target-img"
                        src={src}
                        // 删除了 onLoad 里的初始 crop 设置
                        style={{
                            display: 'block',
                            maxWidth: '100%',
                            maxHeight: '70vh',
                            objectFit: 'contain'
                        }}
                    />
                </ReactCrop>
            </Box>

            <Group justify="space-between" p="md" bg="#141517" style={{ borderTop: '1px solid #333' }}>
                <Group>
                    <Button
                        size="xs"
                        variant={!aspect ? "filled" : "outline"}
                        leftSection={<IconMaximize size={16} />}
                        onClick={() => setAspect(undefined)}
                    >
                        自由比例
                    </Button>
                    <Button
                        size="xs"
                        variant={aspect === 16 / 9 ? "filled" : "outline"}
                        leftSection={<IconAspectRatio size={16} />}
                        onClick={() => setAspect(16 / 9)}
                    >
                        16:9
                    </Button>
                </Group>
                <Button onClick={handleConfirm} color="green">确定裁剪并录入信息</Button>
            </Group>
        </Box>
    );
}