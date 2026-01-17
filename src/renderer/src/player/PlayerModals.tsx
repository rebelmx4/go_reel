// src/renderer/src/player/PlayerModals.tsx
import { ExportScreenshotDialog } from '../components/Dialog/ExportScreenshotDialog';
import { AssignTagDialog } from '../components/Dialog/AssignTagDialog';
import { CreateTagDialog } from '../components/Dialog/CreateTagDialog';
import { useVideoFileRegistryStore } from '../stores';

interface PlayerModalsProps {
    currentPath: string;
    rotation: number;
    showExport: boolean;
    setShowExport: (v: boolean) => void;
    showTag: boolean;
    setShowTag: (v: boolean) => void;
    showCreateTag: boolean;
    setShowCreateTag: (v: boolean) => void;
    tagCoverImage: string;
    setTagCoverImage: (v: string) => void;
}

export function PlayerModals(props: PlayerModalsProps) {
    const videoFile = useVideoFileRegistryStore(s => s.videos[props.currentPath]);

    return (
        <>
            <ExportScreenshotDialog
                opened={props.showExport}
                onClose={() => props.setShowExport(false)}
                videoPath={props.currentPath}
            />
            <AssignTagDialog
                opened={props.showTag}
                onClose={() => props.setShowTag(false)}
                videoPath={props.currentPath}
                assignedTagIds={videoFile?.annotation?.tags ?? []}
                onAssign={(_ids) => { /* 内部已处理保存，此处可留空 */ }}
            />
            <CreateTagDialog
                opened={props.showCreateTag}
                onClose={() => { props.setShowCreateTag(false); props.setTagCoverImage(''); }}
                fullImage={props.tagCoverImage}
                onCreated={async (_) => { }}
            />
        </>
    );
}