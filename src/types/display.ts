export interface Display {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  is_primary: boolean;
  scale_factor: number;
}

export interface DisplayState {
  display_id: string;
  is_blackout: boolean;
  opacity: number;
}
