import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { register } from "@tauri-apps/plugin-global-shortcut";
import "./App.css";

function App() {
  const [visible, setVisible] = useState(true);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const registerShortcut = async () => {
      try {
        await register("CommandOrControl+Shift+B", (event) => {
          if (event.state === "Pressed") {
            setVisible((v) => !v);
          }
        });
      } catch (e) {
        console.error("failed to register shortcut", e);
      }
    };
    registerShortcut();
    const unlistenPromise = listen("toggle-overlay", () => {
      setVisible((v) => !v);
    });
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  return (
    <div
      onDoubleClick={() => setVisible(false)}
      style={{
        backgroundColor: "black",
        opacity: opacity,
        width: "100vw",
        height: "100vh",
        display: visible ? "block" : "none",
      }}
    >
      <div style={{ position: "absolute", top: 10, left: 10, color: "white" }}>
        Opacity:
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={opacity}
          onChange={(e) => setOpacity(parseFloat(e.currentTarget.value))}
        />
      </div>
    </div>
  );
}

export default App;
