// Progress tracking interfaces and types for the murder mystery game

export interface ClueItem {
  id: string;
  text: string;
  timestamp: Date;
  location?: string;
  isCritical: boolean;
  category?: 'motive' | 'opportunity' | 'means' | 'alibi' | 'other';
}

export interface SuspectItem {
  id: string;
  name: string;
  isInterviewed: boolean;
  motive?: string;
  alibi?: string;
  opportunity?: string;
  suspicionLevel: 'low' | 'medium' | 'high';
  notes: string[];
}

export interface LocationItem {
  id: string;
  name: string;
  isExplored: boolean;
  isFullySearched: boolean;
  evidenceFound: string[];
  description?: string;
}

export interface InteractionEvent {
  type: 'clue_discovered' | 'suspect_interviewed' | 'location_explored';
  timestamp: Date;
  details: any;
}

export interface ProgressWeights {
  clues: number;        // 40% weight
  suspects: number;     // 35% weight
  locations: number;    // 25% weight
}

export interface ProgressMetrics {
  cluesFound: number;
  totalClues: number;
  suspectsInterviewed: number;
  totalSuspects: number;
  locationsExplored: number;
  totalLocations: number;
}

export interface ProgressState {
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
  
  // History and events
  interactionHistory: InteractionEvent[];
}

export interface StoredProgressData {
  gameId: string;
  timestamp: Date;
  progressState: ProgressState;
  gamePhase: string;
  isCompleted: boolean;
}

// Default progress weights for calculation
export const defaultProgressWeights: ProgressWeights = {
  clues: 0.4,      // 40% weight
  suspects: 0.35,  // 35% weight
  locations: 0.25  // 25% weight
};

// Initial progress state
export const initialProgressState: ProgressState = {
  discoveredClues: [],
  criticalClues: [],
  knownSuspects: [],
  interviewedSuspects: [],
  availableLocations: [],
  exploredLocations: [],
  fullySearchedLocations: [],
  overallProgress: 0,
  clueProgress: 0,
  suspectProgress: 0,
  locationProgress: 0,
  isPanelExpanded: false,
  activeTab: 'overview',
  interactionHistory: []
};

// Progress state update function
export const updateProgressState = (
  currentState: ProgressState,
  updates: Partial<ProgressState>
): ProgressState => {
  return { ...currentState, ...updates };
};

// Initialize progress state with game-specific data
export const initializeProgressState = (
  suspectCount?: number,
  setting?: string
): ProgressState => {
  const state = { ...initialProgressState };
  
  // Initialize based on game setup if available
  if (suspectCount) {
    // Pre-populate expected suspects count for progress calculation
    state.knownSuspects = Array.from({ length: suspectCount }, (_, i) => ({
      id: `suspect-${i + 1}`,
      name: `Unknown Suspect ${i + 1}`,
      isInterviewed: false,
      suspicionLevel: 'low' as const,
      notes: []
    }));
  }
  
  if (setting) {
    // Pre-populate common locations based on setting
    const commonLocations = getCommonLocationsBySetting(setting);
    state.availableLocations = commonLocations.map((name, i) => ({
      id: `location-${i + 1}`,
      name,
      isExplored: false,
      isFullySearched: false,
      evidenceFound: []
    }));
  }
  
  return state;
};

// Get common locations based on game setting
const getCommonLocationsBySetting = (setting: string): string[] => {
  const locationMap: Record<string, string[]> = {
    'Country House': ['Library', 'Drawing Room', 'Kitchen', 'Garden', 'Study', 'Dining Room'],
    'Boat': ['Deck', 'Cabin', 'Engine Room', 'Galley', 'Bridge', 'Hold'],
    'Aircraft': ['Cockpit', 'First Class', 'Economy', 'Galley', 'Cargo Hold', 'Lavatory'],
    'Island': ['Beach', 'Jungle', 'Cave', 'Cliff', 'Shelter', 'Lagoon'],
    'Cabin': ['Main Room', 'Bedroom', 'Kitchen', 'Porch', 'Basement', 'Attic'],
    'Train': ['Dining Car', 'Sleeping Car', 'Observation Car', 'Engine', 'Baggage Car', 'Platform']
  };
  
  return locationMap[setting] || ['Location 1', 'Location 2', 'Location 3'];
};

// Add a new clue to progress state
export const addClueToProgress = (
  state: ProgressState,
  clueText: string,
  location?: string,
  isCritical: boolean = false
): ProgressState => {
  const newClue: ClueItem = {
    id: `clue-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    text: clueText,
    timestamp: new Date(),
    location,
    isCritical,
    category: 'other' // Default category, can be enhanced with AI detection
  };
  
  const updatedClues = [...state.discoveredClues, newClue];
  const updatedCriticalClues = isCritical 
    ? [...state.criticalClues, newClue.id]
    : state.criticalClues;
  
  const interactionEvent: InteractionEvent = {
    type: 'clue_discovered',
    timestamp: new Date(),
    details: { clueId: newClue.id, text: clueText, location }
  };
  
  return updateProgressState(state, {
    discoveredClues: updatedClues,
    criticalClues: updatedCriticalClues,
    interactionHistory: [...state.interactionHistory, interactionEvent]
  });
};

// Update suspect information
export const updateSuspectInProgress = (
  state: ProgressState,
  suspectName: string,
  updates: Partial<SuspectItem>
): ProgressState => {
  const existingSuspectIndex = state.knownSuspects.findIndex(
    s => s.name.toLowerCase() === suspectName.toLowerCase()
  );
  
  let updatedSuspects = [...state.knownSuspects];
  let updatedInterviewed = [...state.interviewedSuspects];
  
  if (existingSuspectIndex >= 0) {
    // Update existing suspect
    updatedSuspects[existingSuspectIndex] = {
      ...updatedSuspects[existingSuspectIndex],
      ...updates
    };
    
    // Track if this is a new interview
    if (updates.isInterviewed && !state.interviewedSuspects.includes(suspectName)) {
      updatedInterviewed.push(suspectName);
    }
  } else {
    // Add new suspect
    const newSuspect: SuspectItem = {
      id: `suspect-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: suspectName,
      isInterviewed: false,
      suspicionLevel: 'low',
      notes: [],
      ...updates
    };
    updatedSuspects.push(newSuspect);
    
    if (newSuspect.isInterviewed) {
      updatedInterviewed.push(suspectName);
    }
  }
  
  // Add interaction event if this was an interview
  const interactionEvents = [...state.interactionHistory];
  if (updates.isInterviewed) {
    interactionEvents.push({
      type: 'suspect_interviewed',
      timestamp: new Date(),
      details: { suspectName, updates }
    });
  }
  
  return updateProgressState(state, {
    knownSuspects: updatedSuspects,
    interviewedSuspects: updatedInterviewed,
    interactionHistory: interactionEvents
  });
};

// Update location exploration status
export const updateLocationInProgress = (
  state: ProgressState,
  locationName: string,
  isExplored: boolean = true,
  isFullySearched: boolean = false,
  evidenceFound: string[] = []
): ProgressState => {
  const existingLocationIndex = state.availableLocations.findIndex(
    l => l.name.toLowerCase() === locationName.toLowerCase()
  );
  
  let updatedLocations = [...state.availableLocations];
  let updatedExplored = [...state.exploredLocations];
  let updatedFullySearched = [...state.fullySearchedLocations];
  
  if (existingLocationIndex >= 0) {
    // Update existing location
    updatedLocations[existingLocationIndex] = {
      ...updatedLocations[existingLocationIndex],
      isExplored,
      isFullySearched,
      evidenceFound: [
        ...updatedLocations[existingLocationIndex].evidenceFound,
        ...evidenceFound
      ]
    };
  } else {
    // Add new location
    const newLocation: LocationItem = {
      id: `location-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: locationName,
      isExplored,
      isFullySearched,
      evidenceFound
    };
    updatedLocations.push(newLocation);
  }
  
  // Update tracking arrays
  if (isExplored && !state.exploredLocations.includes(locationName)) {
    updatedExplored.push(locationName);
  }
  
  if (isFullySearched && !state.fullySearchedLocations.includes(locationName)) {
    updatedFullySearched.push(locationName);
  }
  
  // Add interaction event
  const interactionEvent: InteractionEvent = {
    type: 'location_explored',
    timestamp: new Date(),
    details: { locationName, isExplored, isFullySearched, evidenceFound }
  };
  
  return updateProgressState(state, {
    availableLocations: updatedLocations,
    exploredLocations: updatedExplored,
    fullySearchedLocations: updatedFullySearched,
    interactionHistory: [...state.interactionHistory, interactionEvent]
  });
};

// Calculate progress metrics
export const calculateProgressMetrics = (state: ProgressState): ProgressMetrics => {
  return {
    cluesFound: state.discoveredClues.length,
    totalClues: Math.max(state.discoveredClues.length, 8), // Estimate minimum clues needed
    suspectsInterviewed: state.interviewedSuspects.length,
    totalSuspects: state.knownSuspects.length,
    locationsExplored: state.exploredLocations.length,
    totalLocations: state.availableLocations.length
  };
};

// Calculate individual progress percentages
export const calculateIndividualProgress = (
  state: ProgressState,
  weights: ProgressWeights = defaultProgressWeights
): { clueProgress: number; suspectProgress: number; locationProgress: number } => {
  const metrics = calculateProgressMetrics(state);
  
  const clueProgress = metrics.totalClues > 0 
    ? Math.min(100, (metrics.cluesFound / metrics.totalClues) * 100)
    : 0;
    
  const suspectProgress = metrics.totalSuspects > 0
    ? (metrics.suspectsInterviewed / metrics.totalSuspects) * 100
    : 0;
    
  const locationProgress = metrics.totalLocations > 0
    ? (metrics.locationsExplored / metrics.totalLocations) * 100
    : 0;
  
  return {
    clueProgress: Math.round(clueProgress),
    suspectProgress: Math.round(suspectProgress),
    locationProgress: Math.round(locationProgress)
  };
};

// Calculate overall progress percentage
export const calculateOverallProgress = (
  state: ProgressState,
  weights: ProgressWeights = defaultProgressWeights
): number => {
  const { clueProgress, suspectProgress, locationProgress } = calculateIndividualProgress(state, weights);
  
  const weightedProgress = 
    (clueProgress * weights.clues) +
    (suspectProgress * weights.suspects) +
    (locationProgress * weights.locations);
  
  return Math.round(weightedProgress);
};

// Update all progress percentages
export const updateAllProgressPercentages = (state: ProgressState): ProgressState => {
  const { clueProgress, suspectProgress, locationProgress } = calculateIndividualProgress(state);
  const overallProgress = calculateOverallProgress(state);
  
  return updateProgressState(state, {
    clueProgress,
    suspectProgress,
    locationProgress,
    overallProgress
  });
};