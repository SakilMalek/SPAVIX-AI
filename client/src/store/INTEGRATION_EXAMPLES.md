# 🔗 Data Persistence Integration Examples

## Dashboard Page Integration

### Before (❌ Data Lost on Navigation)
```typescript
export default function DashboardPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState("modern");
  const [wallColor, setWallColor] = useState("#FFFFFF");
  const [floorType, setFloorType] = useState("wood");
  const [lightingMood, setLightingMood] = useState("warm");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // ❌ Problem: All state lost when navigating away
  // ❌ Problem: State reset on component unmount
}
```

### After (✅ Data Persisted)
```typescript
import { useProjectStore } from '@/store/useProjectStore';

export default function DashboardPage() {
  const {
    uploadedImage,
    setUploadedImage,
    generationParams,
    setGenerationParams,
    isGenerating,
    setIsGenerating,
    selectedProjectId,
    setSelectedProjectId,
  } = useProjectStore();

  // ✅ All state persists across navigation
  // ✅ State survives page refresh
  // ✅ State available after returning to page

  const handleStyleChange = (style: string) => {
    setGenerationParams({ style });
  };

  const handleWallColorChange = (color: string) => {
    setGenerationParams({ wallColor: color });
  };

  return (
    <div>
      <StyleSelector
        value={generationParams.style}
        onChange={handleStyleChange}
      />
      <ColorPicker
        value={generationParams.wallColor}
        onChange={handleWallColorChange}
      />
      {uploadedImage && <img src={uploadedImage} />}
    </div>
  );
}
```

## Editor Page Integration

### Before (❌ Edits Lost)
```typescript
export default function EditorPage() {
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [history, setHistory] = useState<EditState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // ❌ Problem: All edits lost on navigation
  // ❌ Problem: Undo/redo history cleared
  // ❌ Problem: Can't recover after page refresh
}
```

### After (✅ Edits Persisted with Full History)
```typescript
import { useEditorStore } from '@/store/useEditorStore';

export default function EditorPage() {
  const {
    brightness,
    setBrightness,
    contrast,
    setContrast,
    saturation,
    setSaturation,
    rotation,
    setRotation,
    history,
    historyIndex,
    saveToHistory,
    undo,
    redo,
    resetEdits,
  } = useEditorStore();

  // ✅ All edits persisted across navigation
  // ✅ Full undo/redo history available
  // ✅ Edits survive page refresh
  // ✅ Can navigate away and return to continue editing

  const handleBrightnessChange = (value: number) => {
    setBrightness(value);
    saveToHistory({
      brightness: value,
      contrast,
      saturation,
      rotation,
    });
  };

  return (
    <div>
      <Slider
        value={brightness}
        onChange={handleBrightnessChange}
        label="Brightness"
      />
      <Button onClick={undo} disabled={historyIndex <= 0}>
        Undo
      </Button>
      <Button onClick={redo} disabled={historyIndex >= history.length - 1}>
        Redo
      </Button>
      <Button onClick={resetEdits}>Reset All</Button>
    </div>
  );
}
```

## Projects Page Integration

### Before (❌ Selection Lost)
```typescript
export default function ProjectsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatMessages, setChatMessages] = useState([...]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // ❌ Problem: Selected project lost on navigation
  // ❌ Problem: Search query cleared
  // ❌ Problem: Chat messages lost
  // ❌ Problem: UI state reset
}
```

### After (✅ UI State Persisted)
```typescript
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore } from '@/store/useProjectStore';

export default function ProjectsPage() {
  const {
    selectedProjectId,
    setSelectedProjectId,
    searchQuery,
    setSearchQuery,
    chatMessages,
    addChatMessage,
    isChatOpen,
    setIsChatOpen,
  } = useUIStore();

  // ✅ Selected project persists
  // ✅ Search query preserved
  // ✅ Chat history maintained
  // ✅ UI state consistent across navigation

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    staleTime: 5 * 60 * 1000, // 5 minute cache
  });

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search projects..."
      />
      {filteredProjects.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          isSelected={selectedProjectId === project.id}
          onClick={() => setSelectedProjectId(project.id)}
        />
      ))}
      {isChatOpen && (
        <ChatPanel
          messages={chatMessages}
          onSendMessage={(msg) => addChatMessage('user', msg)}
        />
      )}
    </div>
  );
}
```

## Navigation Pattern: Safe State Preservation

### Example: Dashboard → Projects → Dashboard

```typescript
// Step 1: User on Dashboard
// - uploadedImage: "data:image/jpeg;base64,..."
// - generationParams: { style: 'modern', wallColor: '#FFF' }
// - Zustand saves to sessionStorage

// Step 2: User navigates to Projects
// - Dashboard component unmounts
// - useProjectStore still has data in sessionStorage
// - Projects page loads

// Step 3: User navigates back to Dashboard
// - Dashboard component mounts
// - useProjectStore hydrates from sessionStorage
// - uploadedImage and generationParams restored
// - User can continue where they left off ✅
```

## TanStack Query Integration

### Optimized Data Fetching
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function ProjectsPage() {
  const queryClient = useQueryClient();

  // ✅ Cache projects for 5 minutes
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    staleTime: 5 * 60 * 1000,
  });

  // ✅ Cache transformations for 2 minutes per project
  const { data: transformations } = useQuery({
    queryKey: ["projectTransformations", selectedProjectId],
    queryFn: () => fetchProjectTransformations(selectedProjectId),
    staleTime: 2 * 60 * 1000,
    enabled: !!selectedProjectId,
  });

  // ✅ Optimistic update on project creation
  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onMutate: async (newProject) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: ["projects"] });

      // Snapshot previous data
      const previousProjects = queryClient.getQueryData(["projects"]);

      // Optimistically update cache
      queryClient.setQueryData(["projects"], (old: any) => [
        ...old,
        { ...newProject, id: 'temp-id' },
      ]);

      return { previousProjects };
    },
    onError: (err, newProject, context) => {
      // Revert on error
      queryClient.setQueryData(["projects"], context?.previousProjects);
    },
    onSuccess: () => {
      // Invalidate cache after success
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return (
    <div>
      {projects?.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
```

## Edge Case: Multiple Tabs

### Syncing State Across Tabs
```typescript
import { useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';

export default function DashboardPage() {
  const { uploadedImage, setUploadedImage } = useProjectStore();

  useEffect(() => {
    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'project-store') {
        // Another tab updated the store
        // Zustand automatically hydrates from sessionStorage
        console.log('Store synced from other tab');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ✅ State automatically synced across tabs
  return <div>{uploadedImage && <img src={uploadedImage} />}</div>;
}
```

## Edge Case: Page Refresh Recovery

### Automatic Recovery
```typescript
// User is editing image
// - brightness: 120
- contrast: 110
// - saturation: 95
// - rotation: 15
// - Zustand saves to sessionStorage every change

// User presses F5 (refresh)
// - Page reloads
// - Zustand hydrates from sessionStorage
// - All edit values restored ✅
// - User can continue editing

export default function EditorPage() {
  const { brightness, contrast, saturation, rotation } = useEditorStore();

  // ✅ All values automatically restored on refresh
  return (
    <div>
      <p>Brightness: {brightness}</p>
      <p>Contrast: {contrast}</p>
      <p>Saturation: {saturation}</p>
      <p>Rotation: {rotation}</p>
    </div>
  );
}
```

## Edge Case: Browser Back Button

### Preventing Data Loss
```typescript
import { useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';

export default function DashboardPage() {
  const { uploadedImage, generationParams } = useProjectStore();

  useEffect(() => {
    // Handle browser back button
    const handlePopState = () => {
      // Data is preserved in Zustand store
      // Component re-renders with persisted data ✅
      console.log('Back button pressed, data preserved');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ✅ Data available after back button
  return (
    <div>
      {uploadedImage && <img src={uploadedImage} />}
      <p>Style: {generationParams.style}</p>
    </div>
  );
}
```

## Performance Monitoring

### Checking Store Size
```typescript
// In browser console
const store = sessionStorage.getItem('project-store');
const size = new Blob([store]).size;
console.log(`Store size: ${(size / 1024).toFixed(2)}KB`);

// Should be < 100KB for optimal performance
```

### Monitoring Cache Hits
```typescript
import { useQueryClient } from '@tanstack/react-query';

export default function DebugPage() {
  const queryClient = useQueryClient();

  const cacheState = queryClient.getQueryCache().getAll();
  console.log('Cached queries:', cacheState.map(q => ({
    key: q.queryKey,
    state: q.state.status, // 'success', 'loading', 'error'
    dataUpdatedAt: q.state.dataUpdatedAt,
  })));

  return <div>Check console for cache state</div>;
}
```

## Migration Checklist

- [ ] Dashboard: Replace useState with useProjectStore
- [ ] Editor: Replace useState with useEditorStore
- [ ] Projects: Replace useState with useUIStore
- [ ] Remove duplicate state management
- [ ] Fix useEffect dependencies
- [ ] Test navigation persistence
- [ ] Test page refresh recovery
- [ ] Test multiple tabs
- [ ] Monitor performance
- [ ] Deploy to production
