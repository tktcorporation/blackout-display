import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

export function Overlay() {
  const [opacity, setOpacity] = useState(0.85);

  useEffect(() => {
    // Listen for opacity updates
    const unlisten = listen<number>('opacity-update', (event) => {
      setOpacity(event.payload);
    });

    // Double click to hide
    const handleDoubleClick = () => {
      const window = getCurrentWebviewWindow();
      window.hide();
    };

    document.addEventListener('dblclick', handleDoubleClick);

    return () => {
      unlisten.then(fn => fn());
      document.removeEventListener('dblclick', handleDoubleClick);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'black',
        opacity: opacity,
        cursor: 'default',
        userSelect: 'none'
      }}
    />
  );
}