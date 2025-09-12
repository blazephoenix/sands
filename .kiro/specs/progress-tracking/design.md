# Design Document

## Overview

The progress tracking feature will enhance the Sands murder mystery game by providing players with a comprehensive, real-time view of their investigation progress. This feature integrates seamlessly with the existing game architecture, extending the current `CaseBriefing` component and `GameState` management system to provide detailed progress visualization and tracking capabilities.

The design leverages the existing game state infrastructure while adding new progress-specific data structures and UI components that adapt to different screen sizes and game phases.

## Architecture

### Component Architecture

The progress tracking system will be built using a modular component architecture that integrates with the existing Next.js/React structure:

```
components/
├── play/
│   ├── ProgressPanel.tsx          # Main progress tracking panel
│   ├── ProgressSummary.tsx        # Collapsed progress indicator
│   ├── ClueTracker.tsx           # Clue discovery and organization
│   ├── SuspectTracker.tsx        # Suspect interview status
│   ├── LocationTracker.tsx       # Location exploration tracking
│   └── ProgressHistory.tsx       # Historical progress data
├── utils/
│   ├── progressState.ts          # Progress-specific state management
│   ├── progressCalculations.ts   # Progress percentage algorithms
│   └── progressDetection.ts      # AI content parsing for progress
```

### State Management Architecture

The progress tracking will extend the existing `GameState` interface with new progress-specific properties:

```typescript
interface ProgressState {
  // Clue tracking
  discoveredClues: ClueItem[];
  criticalClues: string[];
  
  // Suspect tracking
  knownSuspects: SuspectItem[];
  interviewedSuspects: string[];
  
  // Location tracking
  availableLocations: LocationItem[];
  exploredLocations: string[];
  fullySearchedLocations: string[];
  
  // Progress metrics
  overallProgress: number;
  clueProgress: number;
  suspectProgress: number;
  locationProgress: number;
  
  // Panel state
  isPanelExpanded: boolean;
  activeTab: 'clues' | 'suspects' | 'locations' | 'overview';
}
```

### Integration Points

The progress tracking system integrates with existing components:

1. **Main Chat Component**: Receives progress updates from AI message parsing
2. **CaseBriefing Component**: Enhanced to include progress visualization
3. **GameState Management**: Extended with progress-specific state
4. **AI Message Processing**: Enhanced to detect and extract progress information

## Components and Interfaces

### ProgressPanel Component

**Purpose**: Main container for all progress tracking functionality
**Location**: `components/play/ProgressPanel.tsx`

```typescript
interface ProgressPanelProps {
  gameState: GameState;
  progressState: ProgressState;
  onProgressUpdate: (updates: Partial<ProgressState>) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}
```

**Key Features**:
- Responsive design (sidebar on desktop, overlay on mobile)
- Tabbed interface for different progress categories
- Collapsible with summary indicator
- Real-time progress updates

### ClueTracker Component

**Purpose**: Manages clue discovery and organization
**Location**: `components/play/ClueTracker.tsx`

```typescript
interface ClueItem {
  id: string;
  text: string;
  timestamp: Date;
  location?: string;
  isCritical: boolean;
  category?: 'motive' | 'opportunity' | 'means' | 'alibi' | 'other';
}

interface ClueTrackerProps {
  clues: ClueItem[];
  onClueUpdate: (clueId: string, updates: Partial<ClueItem>) => void;
}
```

**Key Features**:
- Automatic clue detection from AI messages
- Chronological and categorical organization
- Critical clue highlighting
- Location-based clue grouping

### SuspectTracker Component

**Purpose**: Tracks suspect interactions and information
**Location**: `components/play/SuspectTracker.tsx`

```typescript
interface SuspectItem {
  id: string;
  name: string;
  isInterviewed: boolean;
  motive?: string;
  alibi?: string;
  opportunity?: string;
  suspicionLevel: 'low' | 'medium' | 'high';
  notes: string[];
}

interface SuspectTrackerProps {
  suspects: SuspectItem[];
  onSuspectUpdate: (suspectId: string, updates: Partial<SuspectItem>) => void;
}
```

**Key Features**:
- Interview status tracking
- Motive, alibi, and opportunity tracking
- Suspicion level indicators
- Notes and key information storage

### LocationTracker Component

**Purpose**: Monitors location exploration progress
**Location**: `components/play/LocationTracker.tsx`

```typescript
interface LocationItem {
  id: string;
  name: string;
  isExplored: boolean;
  isFullySearched: boolean;
  evidenceFound: string[];
  description?: string;
}

interface LocationTrackerProps {
  locations: LocationItem[];
  onLocationUpdate: (locationId: string, updates: Partial<LocationItem>) => void;
}
```

**Key Features**:
- Exploration status tracking
- Evidence-location linking
- Search completeness indicators
- Visual location map (future enhancement)

### ProgressSummary Component

**Purpose**: Compact progress indicator for collapsed state
**Location**: `components/play/ProgressSummary.tsx`

```typescript
interface ProgressSummaryProps {
  overallProgress: number;
  clueCount: number;
  suspectCount: number;
  locationCount: number;
  onClick: () => void;
}
```

**Key Features**:
- Circular progress indicator
- Quick stats display
- Expandable on click
- Milestone notifications

## Data Models

### Progress Detection System

The system will use enhanced AI message parsing to automatically detect progress elements:

```typescript
interface ProgressDetectionResult {
  clues: ClueItem[];
  suspects: SuspectItem[];
  locations: LocationItem[];
  interactions: InteractionEvent[];
}

interface InteractionEvent {
  type: 'clue_discovered' | 'suspect_interviewed' | 'location_explored';
  timestamp: Date;
  details: any;
}
```

### Progress Calculation Algorithm

Progress percentages will be calculated using weighted scoring:

```typescript
interface ProgressWeights {
  clues: number;        // 40% weight
  suspects: number;     // 35% weight
  locations: number;    // 25% weight
}

interface ProgressMetrics {
  cluesFound: number;
  totalClues: number;
  suspectsInterviewed: number;
  totalSuspects: number;
  locationsExplored: number;
  totalLocations: number;
}
```

### Local Storage Schema

Progress data will be persisted locally for session continuity:

```typescript
interface StoredProgressData {
  gameId: string;
  timestamp: Date;
  progressState: ProgressState;
  gamePhase: string;
  isCompleted: boolean;
}
```

## Error Handling

### AI Parsing Errors

- **Fallback Detection**: Manual progress entry options when AI parsing fails
- **Confidence Scoring**: Track parsing confidence and flag uncertain detections
- **User Correction**: Allow players to manually adjust detected progress items

### State Synchronization Errors

- **State Recovery**: Automatic recovery from corrupted progress state
- **Backup Systems**: Regular state snapshots for rollback capability
- **Validation**: Input validation for all progress updates

### UI Responsiveness Errors

- **Graceful Degradation**: Simplified UI on smaller screens or slower devices
- **Loading States**: Progress indicators during heavy calculations
- **Error Boundaries**: React error boundaries to prevent crashes

## Testing Strategy

### Unit Testing

**Components to Test**:
- ProgressPanel rendering and interaction
- ClueTracker clue detection and organization
- SuspectTracker status updates
- LocationTracker exploration tracking
- Progress calculation algorithms

**Test Cases**:
- Progress percentage calculations with various scenarios
- AI message parsing accuracy
- State update synchronization
- Responsive design breakpoints
- Local storage persistence

### Integration Testing

**Integration Points**:
- Progress panel with main chat interface
- AI message processing with progress detection
- GameState updates with progress state
- Mobile/desktop responsive behavior

**Test Scenarios**:
- Complete game playthrough with progress tracking
- Panel collapse/expand functionality
- Cross-device progress synchronization
- Performance with large amounts of progress data

### User Acceptance Testing

**Test Scenarios**:
- New player onboarding with progress panel
- Experienced player workflow enhancement
- Mobile gameplay experience
- Progress accuracy validation
- Historical progress review

**Success Criteria**:
- 95% accuracy in automatic progress detection
- <2 second response time for progress updates
- 100% responsive design compatibility
- Positive user feedback on investigation efficiency

### Performance Testing

**Metrics to Monitor**:
- Progress calculation performance with large datasets
- UI rendering performance during rapid updates
- Memory usage with extended gameplay sessions
- Local storage efficiency

**Optimization Targets**:
- <100ms progress update latency
- <50MB memory footprint
- <1MB local storage usage per game session
- 60fps UI animations on mobile devices

## Implementation Phases

### Phase 1: Core Infrastructure
- Extend GameState with progress tracking
- Implement basic ProgressPanel component
- Add AI message parsing for progress detection
- Create progress calculation algorithms

### Phase 2: Progress Components
- Implement ClueTracker component
- Implement SuspectTracker component  
- Implement LocationTracker component
- Add responsive design and mobile optimization

### Phase 3: Advanced Features
- Add progress history and case review
- Implement progress milestones and achievements
- Add progress export/sharing capabilities
- Optimize performance and add analytics

### Phase 4: Polish and Enhancement
- Add visual enhancements and animations
- Implement advanced AI parsing improvements
- Add accessibility features
- Conduct comprehensive testing and optimization