import React from 'react';
import { Display, DisplayState } from '../types/display';
import { invoke } from '@tauri-apps/api/core';

interface DisplayCardProps {
  display: Display;
  state: DisplayState;
  onStateChange: (state: DisplayState) => void;
}

export const DisplayCard: React.FC<DisplayCardProps> = ({ display, state, onStateChange }) => {
  const toggleBlackout = async () => {
    const newState = !state.is_blackout;
    
    try {
      if (newState) {
        await invoke('create_overlay_for_display', { displayId: display.id });
      }
      await invoke('toggle_overlay_visibility', { 
        displayId: display.id, 
        visible: newState 
      });
      
      onStateChange({
        ...state,
        is_blackout: newState
      });
    } catch (error) {
      console.error('Failed to toggle blackout:', error);
    }
  };

  const handleOpacityChange = async (opacity: number) => {
    try {
      console.log('Setting opacity:', opacity, 'normalized:', opacity / 100);
      await invoke('set_overlay_opacity', { 
        displayId: display.id, 
        opacity: opacity / 100 
      });
      
      onStateChange({
        ...state,
        opacity
      });
    } catch (error) {
      console.error('Failed to set opacity:', error);
    }
  };

  return (
    <div style={{
      padding: '16px',
      margin: '8px',
      border: '1px solid #333',
      borderRadius: '8px',
      backgroundColor: '#1a1a1a',
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    }}>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#fff' }}>
          {display.name}
          {display.is_primary && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#888' }}>(Primary)</span>}
        </h3>
        <div style={{ fontSize: '12px', color: '#888' }}>
          {display.width} × {display.height} @ {Math.round(display.scale_factor * 100)}%
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#888', fontSize: '14px' }}>暗さ:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={state.opacity}
            onChange={(e) => handleOpacityChange(Number(e.target.value))}
            disabled={!state.is_blackout}
            style={{ width: '100px' }}
          />
          <span style={{ color: '#fff', fontSize: '14px', minWidth: '40px' }}>
            {state.opacity}%
          </span>
        </div>
        
        <button
          onClick={toggleBlackout}
          style={{
            padding: '8px 16px',
            backgroundColor: state.is_blackout ? '#ff4444' : '#4444ff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            minWidth: '80px'
          }}
        >
          {state.is_blackout ? '解除' : '暗くする'}
        </button>
      </div>
    </div>
  );
};