import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { DisplayCard } from "./components/DisplayCard";
import type { Display, DisplayState } from "./types/display";

export function ControlPanel() {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [displayStates, setDisplayStates] = useState<Map<string, DisplayState>>(
    new Map(),
  );
  const [allBlackout, setAllBlackout] = useState(false);

  useEffect(() => {
    // Load displays on mount
    loadDisplays();

    // Listen for global shortcut events
    const unlisten1 = listen("toggle-all-displays", () => {
      toggleAllDisplays();
    });

    const unlisten2 = listen<number>("toggle-display", (event) => {
      const displayIndex = event.payload - 1;
      if (displays[displayIndex]) {
        toggleDisplay(displays[displayIndex].id);
      }
    });

    return () => {
      unlisten1.then((fn) => fn());
      unlisten2.then((fn) => fn());
    };
  }, [displays]);

  const loadDisplays = async () => {
    try {
      const loadedDisplays = await invoke<Display[]>("get_displays");
      setDisplays(loadedDisplays);

      // Initialize display states
      const newStates = new Map<string, DisplayState>();
      for (const display of loadedDisplays) {
        newStates.set(display.id, {
          display_id: display.id,
          is_blackout: false,
          opacity: 50,
        });
      }
      setDisplayStates(newStates);
    } catch (error) {
      console.error("Failed to load displays:", error);
    }
  };

  const toggleDisplay = (displayId: string) => {
    const state = displayStates.get(displayId);
    if (state) {
      const display = displays.find((d) => d.id === displayId);
      if (display) {
        const card = document.querySelector(`[data-display-id="${displayId}"]`);
        if (card) {
          const button = card.querySelector("button");
          button?.click();
        }
      }
    }
  };

  const toggleAllDisplays = async () => {
    const newBlackoutState = !allBlackout;
    setAllBlackout(newBlackoutState);

    for (const display of displays) {
      const state = displayStates.get(display.id);
      if (state && state.is_blackout !== newBlackoutState) {
        await toggleDisplayBlackout(display, state, newBlackoutState);
      }
    }
  };

  const toggleDisplayBlackout = async (
    display: Display,
    state: DisplayState,
    blackout: boolean,
  ) => {
    try {
      if (blackout) {
        await invoke("create_overlay_for_display", { displayId: display.id });
      }
      await invoke("toggle_overlay_visibility", {
        displayId: display.id,
        visible: blackout,
      });

      if (blackout) {
        await invoke("set_overlay_opacity", {
          displayId: display.id,
          opacity: state.opacity / 100,
        });
      }

      handleStateChange({
        ...state,
        is_blackout: blackout,
      });
    } catch (error) {
      console.error("Failed to toggle display blackout:", error);
    }
  };

  const handleStateChange = (newState: DisplayState) => {
    setDisplayStates((prev) => {
      const newMap = new Map(prev);
      newMap.set(newState.display_id, newState);
      return newMap;
    });
  };

  return (
    <div
      style={{
        height: "100vh",
        backgroundColor: "#0a0a0a",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "16px",
          borderBottom: "1px solid #333",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "20px" }}>
          Blackout Display Control
        </h1>
        <button
          type="button"
          onClick={toggleAllDisplays}
          style={{
            padding: "8px 16px",
            backgroundColor: allBlackout ? "#ff4444" : "#4444ff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {allBlackout ? "🔴 全体解除" : "🟢 全体ON"}
        </button>
      </header>

      <main style={{ flex: 1, padding: "16px", overflowY: "auto" }}>
        {displays.map((display) => {
          const state = displayStates.get(display.id) || {
            display_id: display.id,
            is_blackout: false,
            opacity: 50,
          };

          return (
            <div key={display.id} data-display-id={display.id}>
              <DisplayCard
                display={display}
                state={state}
                onStateChange={handleStateChange}
              />
            </div>
          );
        })}
      </main>

      <footer
        style={{
          padding: "16px",
          borderTop: "1px solid #333",
          fontSize: "12px",
          color: "#666",
          textAlign: "center",
        }}
      >
        <p style={{ margin: "4px 0" }}>
          ダブルクリックで解除 | Cmd/Ctrl+Shift+B で全体切替
        </p>
        <p style={{ margin: "4px 0" }}>
          Cmd/Ctrl+Alt+[1-4] で個別ディスプレイ切替
        </p>
      </footer>
    </div>
  );
}
