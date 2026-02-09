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
        const img = document.getElementById('crop-target-img') as HTMLImageElement;
        if (!img) return;

        // 修改判断逻辑：只有宽高都大于 0 且存在选区，才认为是有效裁剪
        const isValidCrop = completedCrop && completedCrop.width > 0 && completedCrop.height > 0;

        if (!isValidCrop) {
            // 如果是无效选区（比如只是点了一下或者双击时产生的 0 宽高选区）
            // 直接返回原图 Base64 或原始 src
            onConfirm(src);
            return;
        }

        // --- 以下是有有效选区时的裁剪逻辑 ---
        const targetCrop = completedCrop!;
        const canvas = document.createElement('canvas');
        const scaleX = img.naturalWidth / img.width;
        const scaleY = img.naturalHeight / img.height;

        const cropW = targetCrop.width * scaleX;
        const cropH = targetCrop.height * scaleY;

        canvas.width = cropW;
        canvas.height = cropH;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(
                img,
                targetCrop.x * scaleX,
                targetCrop.y * scaleY,
                cropW,
                cropH,
                0,
                0,
                cropW,
                cropH
            );
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
            }}
                onDoubleClick={handleConfirm}

            >
                <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspect}
                    style={{ maxWidth: '100%', maxHeight: '70vh' }}
                // 添加双击事件：ReactCrop 容器覆盖了整个图片区域及阴影
                >
                    <img
                        id="crop-target-img"
                        src={src}
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