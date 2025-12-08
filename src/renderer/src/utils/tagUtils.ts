/**
 * Hotkey mapping for pinned tags
 * Positions 0-9 map to keys 1-5, Q, W, E, R, ~
 */
export const PINNED_TAG_HOTKEYS = ['1', '2', '3', '4', '5', 'q', 'w', 'e', 'r', '~'] as const;

export function getHotkeyForPosition(position: number): string | undefined {
  return PINNED_TAG_HOTKEYS[position];
}

export function getPositionForHotkey(hotkey: string): number | undefined {
  const index = PINNED_TAG_HOTKEYS.indexOf(hotkey.toLowerCase() as any);
  return index >= 0 ? index : undefined;
}

/**
 * Handle clipboard paste for image replacement
 * Returns base64 data URL if valid image found
 */
export async function handleClipboardImage(): Promise<string | null> {
  try {
    const clipboardItems = await navigator.clipboard.read();
    
    for (const item of clipboardItems) {
      // Check for image types
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type);
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to read clipboard:', error);
    return null;
  }
}
