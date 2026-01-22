import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GenerationParams {
  style: string;
  wallColor: string;
  floorType: string;
  lightingMood: string;
}

interface ProjectState {
  // Current project
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;

  // Uploaded image
  uploadedImage: string | null;
  setUploadedImage: (image: string | null) => void;

  // Generation parameters
  generationParams: GenerationParams;
  setGenerationParams: (params: Partial<GenerationParams>) => void;
  resetGenerationParams: () => void;

  // Generation state
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;

  // Generated transformation
  generatedImage: string | null;
  generationId: string | null;
  setGeneratedImage: (image: string | null, id: string | null) => void;

  // Clear all project data
  clearProjectData: () => void;
}

const defaultParams: GenerationParams = {
  style: 'modern',
  wallColor: '#FFFFFF',
  floorType: 'wood',
  lightingMood: 'warm',
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      selectedProjectId: null,
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),

      uploadedImage: null,
      setUploadedImage: (image) => set({ uploadedImage: image }),

      generationParams: defaultParams,
      setGenerationParams: (params) =>
        set((state) => ({
          generationParams: { ...state.generationParams, ...params },
        })),
      resetGenerationParams: () => set({ generationParams: defaultParams }),

      isGenerating: false,
      setIsGenerating: (generating) => set({ isGenerating: generating }),

      generatedImage: null,
      generationId: null,
      setGeneratedImage: (image, id) =>
        set({ generatedImage: image, generationId: id }),

      clearProjectData: () =>
        set({
          selectedProjectId: null,
          uploadedImage: null,
          generatedImage: null,
          generationId: null,
          generationParams: defaultParams,
          isGenerating: false,
        }),
    }),
    {
      name: 'project-store',
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
      // Only persist certain fields (not large images)
      partialize: (state) => ({
        selectedProjectId: state.selectedProjectId,
        generationParams: state.generationParams,
        generationId: state.generationId,
      }),
    }
  )
);
