/**
 * useHotkeys - Custom hook for keyboard shortcuts
 * Usage: useHotkeys({ 'alt+s': () => save(), 'ctrl+k': () => focusSearch() })
 */

import { useEffect, useCallback } from 'react';

interface HotkeyMap {
    [key: string]: (e: KeyboardEvent) => void;
}

export function useHotkeys(hotkeys: HotkeyMap, deps: React.DependencyList = []) {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const keys: string[] = [];
        
        if (e.ctrlKey) keys.push('ctrl');
        if (e.altKey) keys.push('alt');
        if (e.shiftKey) keys.push('shift');
        if (e.metaKey) keys.push('meta');
        
        keys.push(e.key.toLowerCase());
        
        const combo = keys.join('+');
        const handler = hotkeys[combo];
        
        if (handler) {
            e.preventDefault();
            handler(e);
        }
    }, [hotkeys]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown, ...deps]);
}

export default useHotkeys;
