// src/renderer/src/player/components/CreateTagDialog.tsx
import { useState, useEffect } from 'react';
import { Modal, Text } from '@mantine/core';
import { TagCropView } from '../Tag/TagCropView';
import { TagInfoView } from '../Tag/TagInfoView'; // 将你原有的表单逻辑抽离到这个文件

interface CreateTagDialogProps {
    opened: boolean;
    onClose: () => void;
    fullImage: string; // 初始全屏截图
    onCreated?: (tag: any) => void;
}

export function CreateTagDialog({ opened, onClose, fullImage, onCreated }: CreateTagDialogProps) {
    const [step, setStep] = useState<'crop' | 'info'>('crop');
    const [currentCover, setCurrentCover] = useState('');

    // 每次打开时重置为裁剪步骤
    useEffect(() => {
        if (opened) {
            setStep('crop');
            setCurrentCover(fullImage);
        }
    }, [opened, fullImage]);

    const handleCropConfirm = (croppedImage: string) => {
        setCurrentCover(croppedImage);
        setStep('info');
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Text fw={700}>{step === 'crop' ? '第一步：选取封面区域' : '第二步：填写标签信息'}</Text>}
            size="90%" // 统一使用 90%
            styles={{
                body: { padding: 0, overflow: 'hidden' },
                content: { backgroundColor: '#141517' }
            }}
        >
            {step === 'crop' ? (
                <TagCropView
                    src={fullImage}
                    onConfirm={handleCropConfirm}
                />
            ) : (
                <TagInfoView
                    cover={currentCover} // 裁剪后的图
                    onClose={onClose}
                    onCreated={onCreated}
                    setCover={setCurrentCover} // 依然支持 Ctrl+V 替换
                />
            )}
        </Modal>
    );
}