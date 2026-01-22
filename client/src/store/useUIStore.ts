import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Projects page
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isProjectListOpen: boolean;
  setIsProjectListOpen: (open: boolean) => void;

  // Chat
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  chatMessages: Array<{ role: 'user' | 'bot'; content: string }>;
  addChatMessage: (role: 'user' | 'bot', content: string) => void;
  clearChatMessages: () => void;

  // Dialogs
  isCreateDialogOpen: boolean;
  setIsCreateDialogOpen: (open: boolean) => void;
  isShareDialogOpen: boolean;
  setIsShareDialogOpen: (open: boolean) => void;
  isTransformationModalOpen: boolean;
  setIsTransformationModalOpen: (open: boolean) => void;

  // Scroll positions
  scrollPositions: Record<string, number>;
  setScrollPosition: (page: string, position: number) => void;
  getScrollPosition: (page: string) => number;

  // Clear all UI state
  clearUIState: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      selectedProjectId: null,
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),

      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),

      isProjectListOpen: false,
      setIsProjectListOpen: (open) => set({ isProjectListOpen: open }),

      isChatOpen: false,
      setIsChatOpen: (open) => set({ isChatOpen: open }),

      chatMessages: [
        {
          role: 'bot',
          content:
            "Hello! I'm here to help you with your project. Ask me anything about design, materials, or transformations!",
        },
      ],
      addChatMessage: (role, content) =>
        set((state) => ({
          chatMessages: [...state.chatMessages, { role, content }],
        })),
      clearChatMessages: () =>
        set({
          chatMessages: [
            {
              role: 'bot',
              content:
                "Hello! I'm here to help you with your project. Ask me anything about design, materials, or transformations!",
            },
          ],
        }),

      isCreateDialogOpen: false,
      setIsCreateDialogOpen: (open) => set({ isCreateDialogOpen: open }),

      isShareDialogOpen: false,
      setIsShareDialogOpen: (open) => set({ isShareDialogOpen: open }),

      isTransformationModalOpen: false,
      setIsTransformationModalOpen: (open) => set({ isTransformationModalOpen: open }),

      scrollPositions: {},
      setScrollPosition: (page, position) =>
        set((state) => ({
          scrollPositions: { ...state.scrollPositions, [page]: position },
        })),
      getScrollPosition: (page) => get().scrollPositions[page] || 0,

      clearUIState: () =>
        set({
          selectedProjectId: null,
          searchQuery: '',
          isProjectListOpen: false,
          isChatOpen: false,
          isCreateDialogOpen: false,
          isShareDialogOpen: false,
          isTransformationModalOpen: false,
          scrollPositions: {},
        }),
    }),
    {
      name: 'ui-store',
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
      // Only persist UI preferences, not sensitive data
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        scrollPositions: state.scrollPositions,
      }),
    }
  )
);
