# 🏗️ Data Persistence Architecture Guide

## Overview

This document outlines the production-grade data persistence strategy for SPAVIX, ensuring user work is never lost during navigation, page refresh, or multi-tab scenarios.

## Architecture Layers

### 1. Global State Management (Zustand)

Three specialized stores handle different data domains:

#### `useProjectStore` - Project & Generation Data
**Persists to:** sessionStorage (partial)
**Data:**
- `selectedProjectId` - Current project context
- `uploadedImage` - User's uploaded image (not persisted due to size)
- `generationParams` - Style, colors, lighting settings
- `generatedImage` - AI transformation result (not persisted)
- `generationId` - Reference to saved transformation
- `isGenerating` - Loading state

**Why sessionStorage?** Cleared on tab close, survives page navigation and refresh within session.

#### `useEditorStore` - Image Editing State
**Persists to:** sessionStorage (full)
**Data:**
- Edit parameters: brightness, contrast, saturation, rotation
- Crop area
- Full undo/redo history
- Current history index

**Why full persistence?** Users expect to recover edits after navigation or refresh.

#### `useUIStore` - UI Context & Preferences
**Persists to:** sessionStorage (partial)
**Data:**
- Selected project ID
- Search queries
- Dialog open/close states
- Chat messages
- Scroll positions per page

**Why partial persistence?** Only persist non-sensitive UI state; dialogs reset on navigation.

### 2. Server-Side Caching (TanStack Query)

**Configuration:**
```typescript
// Projects: 5 minute stale time
queryKey: ["projects"]
staleTime: 5 * 60 * 1000

// Transformations: 2 minute stale time
queryKey: ["projectTransformations", projectId]
staleTime: 2 * 60 * 1000

// Subscription: 10 minute stale time
queryKey: ["subscription"]
staleTime: 10 * 60 * 1000
```

**Benefits:**
- Prevents unnecessary API calls on page switch
- Automatic cache invalidation after stale time
- Optimistic updates for mutations
- Automatic retry on failure

### 3. Temporary Data (sessionStorage)

For data that shouldn't survive tab close:
- Edited images (cleared after use)
- Form drafts
- Temporary project IDs

### 4. Server as Source of Truth

For persistent data:
- Projects (create/update/delete)
- Transformations (generate/save)
- User profile
- Subscription data

## Data Flow Patterns

### Pattern 1: Navigation Without Data Loss

**Before (❌ Data Lost):**
```
Dashboard (state) → Navigate to Projects → Projects (new state)
                                          ↓
                                    Old state lost
```

**After (✅ Data Preserved):**
```
Dashboard → useProjectStore → sessionStorage
                ↓
            Navigate to Projects
                ↓
        useProjectStore hydrates from sessionStorage
                ↓
            Projects page has same context
```

### Pattern 2: Page Refresh Recovery

**Before (❌ Data Lost):**
```
User editing → Refresh → All edits gone
```

**After (✅ Data Recovered):**
```
User editing → Zustand saves to sessionStorage → Refresh
                                                    ↓
                                        Zustand hydrates from sessionStorage
                                                    ↓
                                            Edits recovered
```

### Pattern 3: Optimistic Updates

**Before (❌ Slow UI):**
```
User action → API call → Wait for response → Update UI
```

**After (✅ Instant UI):**
```
User action → Update UI immediately → API call in background
                ↓
            If API fails → Revert to previous state
```

## Implementation Checklist

### ✅ Phase 1: Global State (COMPLETED)
- [x] Create `useProjectStore.ts`
- [x] Create `useEditorStore.ts`
- [x] Create `useUIStore.ts`
- [x] Configure sessionStorage persistence
- [x] Set up partial persistence (exclude large data)

### ⏳ Phase 2: Page Integration (TODO)
- [ ] Update Dashboard to use `useProjectStore`
- [ ] Update Editor to use `useEditorStore`
- [ ] Update Projects to use `useUIStore`
- [ ] Fix useEffect dependencies
- [ ] Remove duplicate state

### ⏳ Phase 3: TanStack Query Optimization (TODO)
- [ ] Configure stale times
- [ ] Add cache invalidation strategy
- [ ] Implement optimistic updates
- [ ] Add error recovery

### ⏳ Phase 4: Edge Case Handling (TODO)
- [ ] Handle multiple tabs
- [ ] Handle browser back button
- [ ] Handle session expiry
- [ ] Handle large image data

### ⏳ Phase 5: Testing (TODO)
- [ ] Test navigation persistence
- [ ] Test page refresh recovery
- [ ] Test multiple tabs
- [ ] Test data consistency

## Usage Examples

### Using Project Store
```typescript
import { useProjectStore } from '@/store/useProjectStore';

function Dashboard() {
  const { uploadedImage, setUploadedImage, generationParams, setGenerationParams } = useProjectStore();

  // Data persists across navigation
  return (
    <div>
      {uploadedImage && <img src={uploadedImage} />}
      <button onClick={() => setGenerationParams({ style: 'modern' })}>
        Change Style
      </button>
    </div>
  );
}
```

### Using Editor Store
```typescript
import { useEditorStore } from '@/store/useEditorStore';

function Editor() {
  const { brightness, setBrightness, undo, redo, history } = useEditorStore();

  // Full undo/redo history persisted
  return (
    <div>
      <Slider value={brightness} onChange={setBrightness} />
      <button onClick={undo} disabled={history.length === 0}>Undo</button>
      <button onClick={redo}>Redo</button>
    </div>
  );
}
```

### Using UI Store
```typescript
import { useUIStore } from '@/store/useUIStore';

function Projects() {
  const { selectedProjectId, setSelectedProjectId, searchQuery, setSearchQuery } = useUIStore();

  // UI state persists across navigation
  return (
    <div>
      <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      {/* Projects filtered by searchQuery */}
    </div>
  );
}
```

## Best Practices

### 1. Avoid Stale State
```typescript
// ❌ BAD: State might be stale
const [data, setData] = useState(null);
useEffect(() => {
  fetchData().then(setData);
}, []); // Empty dependency array

// ✅ GOOD: Use Zustand + TanStack Query
const data = useProjectStore((state) => state.uploadedImage);
const { data: projects } = useQuery({ queryKey: ["projects"] });
```

### 2. Prevent Data Overwrites
```typescript
// ❌ BAD: Overwrites user edits
useEffect(() => {
  fetchProjectData().then(setProject);
}, [projectId]); // Refetches on every projectId change

// ✅ GOOD: Only fetch if not cached
const { data: project } = useQuery({
  queryKey: ["project", projectId],
  staleTime: 5 * 60 * 1000, // Cache for 5 minutes
});
```

### 3. Safe Navigation
```typescript
// ❌ BAD: Clears state on navigation
function Dashboard() {
  const [image, setImage] = useState(null);
  // State lost when navigating away
}

// ✅ GOOD: State persists across navigation
function Dashboard() {
  const { uploadedImage } = useProjectStore();
  // State available after navigation
}
```

### 4. Optimistic Updates
```typescript
// ✅ GOOD: Update UI immediately
const mutation = useMutation({
  mutationFn: updateProject,
  onMutate: async (newData) => {
    // Optimistically update cache
    queryClient.setQueryData(['project'], newData);
  },
  onError: (error, newData, context) => {
    // Revert on error
    queryClient.setQueryData(['project'], context.previousData);
  },
});
```

## Troubleshooting

### Data Lost After Navigation
1. Check if component uses local `useState` instead of Zustand
2. Verify Zustand store is properly initialized
3. Check sessionStorage in DevTools → Application → Session Storage

### Data Not Updating
1. Verify mutation is calling `queryClient.invalidateQueries()`
2. Check TanStack Query DevTools for cache state
3. Ensure `credentials: 'include'` is set on fetch calls

### Multiple Tabs Out of Sync
1. Use `useEffect` to sync across tabs via `storage` event
2. Consider using `BroadcastChannel` API for real-time sync
3. Implement periodic polling as fallback

## Performance Considerations

### sessionStorage Limits
- ~5-10MB per domain (browser dependent)
- Large images should NOT be persisted
- Use IndexedDB for images if needed

### Cache Invalidation
- Automatic after stale time
- Manual via `queryClient.invalidateQueries()`
- On logout: `queryClient.clear()`

### Memory Usage
- Zustand stores are lightweight (~1-5KB)
- TanStack Query cache grows with data
- Monitor via React DevTools Profiler

## Migration Path

### Step 1: Add Zustand Stores
✅ Already created

### Step 2: Update Components
- Replace `useState` with Zustand hooks
- Remove duplicate state
- Fix useEffect dependencies

### Step 3: Optimize TanStack Query
- Add proper stale times
- Implement cache invalidation
- Add optimistic updates

### Step 4: Test & Monitor
- Test all navigation scenarios
- Monitor performance
- Gather user feedback

## References

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [sessionStorage MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
- [IndexedDB MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
