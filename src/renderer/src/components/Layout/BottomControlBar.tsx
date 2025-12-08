import { useVideoContext } from '../../contexts';
import { PlayerControls } from '../PlayerControls';

/**
 * Bottom Control Bar Component
 * Integrates player controls for video playback
 */
export function BottomControlBar() {
    const { videoRef } = useVideoContext();

    const handleScreenshot = () => {
        // TODO: Implement screenshot functionality
        console.log('Screenshot requested');
    };

    const handleNext = () => {
        // TODO: Implement next video functionality
        console.log('Next video requested');
    };

    // Only render controls if we have a video ref
    if (!videoRef) {
        return null;
    }

    return (
        <PlayerControls
            videoRef={videoRef}
            onScreenshot={handleScreenshot}
            onNext={handleNext}
        />
    );
}
