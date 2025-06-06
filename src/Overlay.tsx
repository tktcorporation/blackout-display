import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

export function Overlay() {
  const [opacity, setOpacity] = useState(0.5);

  useEffect(() => {
    // Listen for opacity updates
    const unlisten = listen<number>("opacity-update", (event) => {
      console.log("Received opacity update:", event.payload);
      setOpacity(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: `rgba(0, 0, 0, ${opacity})`,
        cursor: "default",
        userSelect: "none",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
}
