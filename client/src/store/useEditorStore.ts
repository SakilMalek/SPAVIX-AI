import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface EditState {
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  cropArea?: { x: number; y: number; width: number; height: number };
}

interface EditorStoreState {
  // Current edit state
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  cropArea?: { x: number; y: number; width: number; height: number };

  // Update individual properties
  setBrightness: (value: number) => void;
  setContrast: (value: number) => void;
  setSaturation: (value: number) => void;
  setRotation: (value: number) => void;
  setCropArea: (area?: { x: number; y: number; width: number; height: number }) => void;

  // History management
  history: EditState[];
  historyIndex: number;
  saveToHistory: (state: EditState) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;

  // Reset to defaults
  resetEdits: () => void;

  // Get current state
  getCurrentState: () => EditState;
}

const defaultState: EditState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  rotation: 0,
};

export const useEditorStore = create<EditorStoreState>()(
  persist(
    (set, get) => ({
      ...defaultState,
      cropArea: undefined,

      setBrightness: (value) => set({ brightness: value }),
      setContrast: (value) => set({ contrast: value }),
      setSaturation: (value) => set({ saturation: value }),
      setRotation: (value) => set({ rotation: value }),
      setCropArea: (area) => set({ cropArea: area }),

      history: [],
      historyIndex: -1,

      saveToHistory: (state) =>
        set((current) => {
          const newHistory = current.history.slice(0, current.historyIndex + 1);
          newHistory.push(state);
          return {
            history: newHistory,
            historyIndex: newHistory.length - 1,
          };
        }),

      undo: () =>
        set((state) => {
          if (state.historyIndex > 0) {
            const newIndex = state.historyIndex - 1;
            const prevState = state.history[newIndex];
            return {
              ...prevState,
              historyIndex: newIndex,
            };
          }
          return state;
        }),

      redo: () =>
        set((state) => {
          if (state.historyIndex < state.history.length - 1) {
            const newIndex = state.historyIndex + 1;
            const nextState = state.history[newIndex];
            return {
              ...nextState,
              historyIndex: newIndex,
            };
          }
          return state;
        }),

      clearHistory: () =>
        set({
          history: [],
          historyIndex: -1,
        }),

      resetEdits: () =>
        set({
          ...defaultState,
          cropArea: undefined,
          history: [],
          historyIndex: -1,
        }),

      getCurrentState: () => {
        const state = get();
        return {
          brightness: state.brightness,
          contrast: state.contrast,
          saturation: state.saturation,
          rotation: state.rotation,
          cropArea: state.cropArea,
        };
      },
    }),
    {
      name: 'editor-store',
      storage: {
        getItem: (name) => {
          const item = sessionStorage.getItem(name);
          return item ? JSON.parse(item) : null;
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name);
        },
      },
    }
  )
);
