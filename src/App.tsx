import { useEffect } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { ControlPanel } from "./ControlPanel";
import { Overlay } from "./Overlay";
import "./App.css";

function App() {
  const currentWindow = getCurrentWebviewWindow();
  const isOverlay = currentWindow.label.startsWith('overlay-');

  useEffect(() => {
    // Show the window after app loads
    currentWindow.show();
  }, []);

  // Render different components based on window type
  return isOverlay ? <Overlay /> : <ControlPanel />;
}

export default App;
