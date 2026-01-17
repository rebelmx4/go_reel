// src/renderer/src/player/components/TagCropView.tsx
import { useState } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Box, Button, Group, ActionIcon, Tooltip } from '@mantine/core';
import { IconAspectRatio, IconMaximize } from '@tabler/icons-react';

interface TagCropViewProps {
    src: string;
    onConfirm: (croppedBase64: string) => void;
}

export function TagCropView({ src, onConfirm }: TagCropViewProps) {
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [aspect, setAspect] = useState<number | undefined>(undefined);

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        // 默认给一个 80% 的框，防止初始状态看不到
        const initialCrop = centerCrop(
            makeAspectCrop({ unit: '%', width: 80 }, aspect || 16 / 9, width, height),
            width,
            height
        );
        setCrop(initialCrop);
    };

    const handleConfirm = () => {
        // 如果用户没动，completedCrop 可能是空的，我们需要手动构造一个覆盖全图的裁剪
        const targetCrop = completedCrop;

        const img = document.getElementById('crop-target-img') as HTMLImageElement;
        if (!img) return;

        const canvas = document.createElement('canvas');
        const scaleX = img.naturalWidth / img.width;
        const scaleY = img.naturalHeight / img.height;

        // 如果用户没选，默认裁剪全图
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
                        onLoad={onImageLoad}
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