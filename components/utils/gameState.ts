import { 
  ProgressState, 
  initialProgressState, 
  initializeProgressState,
  updateProgressState,
  updateAllProgressPercentages
} from './progressState';
import { 
  detectProgressFromMessage, 
  DetectionContext,
  ProgressDetectionResult,
  extractGameInfoEnhanced
} from './progressDetection';

export interface GameState {
  phase: 'welcome' | 'setup' | 'investigation' | 'ended';
  setting?: string;
  suspectCount?: number;
  clues: string[];
  suspects: string[];
  locations: string[];
  evidence: string[];
  theories: string[];
  score: number;
  actionsCount: number;
  gameResult?: 'success' | 'failure' | 'abrupt_end';
  endReason?: string;
  // Progress tracking integration
  progressState: ProgressState;
}

export const initialGameState: GameState = {
  phase: 'welcome',
  clues: [],
  suspects: [],
  locations: [],
  evidence: [],
  theories: [],
  score: 100,
  actionsCount: 0,
  progressState: initialProgressState,
};

export const updateGameState = (
  currentState: GameState,
  updates: Partial<GameState>
): GameState => {
  return { ...currentState, ...updates };
};

export const calculateScore = (state: GameState): number => {
  const baseScore = 100;
  const actionPenalty = Math.max(0, state.actionsCount - 10) * 2; // Penalty after 10 actions
  const bonusForEfficiency = state.actionsCount <= 8 ? 20 : 0;
  
  return Math.max(0, baseScore - actionPenalty + bonusForEfficiency);
};

export const extractGameInfo = (
  message: string,
  gameState?: GameState,
  messageIndex: number = 0
): {
  clues?: string[];
  suspects?: string[];
  locations?: string[];
  evidence?: string[];
  confidence?: number;
} => {
  // Create detection context
  const context: DetectionContext = {
    currentLocation: gameState?.progressState?.availableLocations?.find(l => l.isExplored)?.name,
    gamePhase: gameState?.phase || 'investigation',
    messageIndex
  };
  
  // Use enhanced detection with fallback to simple patterns
  try {
    const detection = detectProgressFromMessage(message, context);
    
    const enhancedResult = {
      clues: detection.clues.map(clue => clue.text),
      suspects: detection.suspects.map(suspect => suspect.name),
      locations: detection.locations.map(location => location.name),
      evidence: detection.clues.filter(clue => clue.category === 'means').map(clue => clue.text),
      confidence: detection.confidence
    };
    
    // If enhanced detection has low confidence, fall back to simple patterns
    if (detection.confidence < 0.3) {
      const simpleResult = extractGameInfoSimple(message);
      return { 
        ...enhancedResult, 
        ...simpleResult,
        confidence: Math.max(detection.confidence, 0.2) // Minimum confidence for fallback
      };
    }
    
    return enhancedResult;
  } catch (error) {
    console.warn('Enhanced extraction failed, falling back to simple patterns:', error);
    return { ...extractGameInfoSimple(message), confidence: 0.1 };
  }
};

// Keep the original simple extraction as fallback
const extractGameInfoSimple = (message: string): {
  clues?: string[];
  suspects?: string[];
  locations?: string[];
  evidence?: string[];
} => {
  const info: any = {};
  
  // Simple pattern matching for game elements
  const cluePatterns = [
    /clue[s]?[:\-\s]+(.*?)(?:\n|$)/gi,
    /evidence[:\-\s]+(.*?)(?:\n|$)/gi,
    /discovered?[:\-\s]+(.*?)(?:\n|$)/gi
  ];
  
  const suspectPatterns = [
    /suspect[s]?[:\-\s]+(.*?)(?:\n|$)/gi,
    /person[s]?[:\-\s]+(.*?)(?:\n|$)/gi
  ];
  
  const locationPatterns = [
    /location[s]?[:\-\s]+(.*?)(?:\n|$)/gi,
    /room[s]?[:\-\s]+(.*?)(?:\n|$)/gi,
    /area[s]?[:\-\s]+(.*?)(?:\n|$)/gi
  ];
  
  // Extract clues
  cluePatterns.forEach(pattern => {
    const matches = Array.from(message.matchAll(pattern));
    if (matches.length > 0) {
      info.clues = matches.map(match => match[1].trim()).filter(Boolean);
    }
  });
  
  // Extract suspects
  suspectPatterns.forEach(pattern => {
    const matches = Array.from(message.matchAll(pattern));
    if (matches.length > 0) {
      info.suspects = matches.map(match => match[1].trim()).filter(Boolean);
    }
  });
  
  // Extract locations
  locationPatterns.forEach(pattern => {
    const matches = Array.from(message.matchAll(pattern));
    if (matches.length > 0) {
      info.locations = matches.map(match => match[1].trim()).filter(Boolean);
    }
  });
  
  return info;
};

// Progress state integration functions

// Initialize progress state when game setup is complete
export const initializeGameProgress = (
  gameState: GameState,
  suspectCount?: number,
  setting?: string
): GameState => {
  const progressState = initializeProgressState(suspectCount, setting);
  return updateGameState(gameState, { progressState });
};

// Update progress state within game state
export const updateGameProgress = (
  gameState: GameState,
  progressUpdates: Partial<ProgressState>
): GameState => {
  const updatedProgressState = updateProgressState(gameState.progressState, progressUpdates);
  const progressWithCalculations = updateAllProgressPercentages(updatedProgressState);
  return updateGameState(gameState, { progressState: progressWithCalculations });
};

// Process AI message and update progress state with detected elements
export const processMessageForProgress = (
  gameState: GameState,
  message: string,
  messageIndex: number = 0
): GameState => {
  const context: DetectionContext = {
    currentLocation: gameState.progressState.availableLocations.find(l => l.isExplored)?.name,
    gamePhase: gameState.phase,
    messageIndex
  };
  
  try {
    const detection = detectProgressFromMessage(message, context);
    let updatedProgressState = gameState.progressState;
    
    // Add detected clues
    detection.clues.forEach(clue => {
      // Check if clue already exists
      const existingClue = updatedProgressState.discoveredClues.find(
        existing => existing.text.toLowerCase().includes(clue.text.toLowerCase()) ||
                   clue.text.toLowerCase().includes(existing.text.toLowerCase())
      );
      
      if (!existingClue) {
        updatedProgressState = updateProgressState(updatedProgressState, {
          discoveredClues: [...updatedProgressState.discoveredClues, clue],
          criticalClues: clue.isCritical 
            ? [...updatedProgressState.criticalClues, clue.id]
            : updatedProgressState.criticalClues
        });
      }
    });
    
    // Add detected suspects
    detection.suspects.forEach(suspect => {
      const existingSuspect = updatedProgressState.knownSuspects.find(
        existing => existing.name.toLowerCase() === suspect.name.toLowerCase()
      );
      
      if (!existingSuspect) {
        updatedProgressState = updateProgressState(updatedProgressState, {
          knownSuspects: [...updatedProgressState.knownSuspects, suspect]
        });
      }
    });
    
    // Add detected locations
    detection.locations.forEach(location => {
      const existingLocation = updatedProgressState.availableLocations.find(
        existing => existing.name.toLowerCase() === location.name.toLowerCase()
      );
      
      if (!existingLocation) {
        updatedProgressState = updateProgressState(updatedProgressState, {
          availableLocations: [...updatedProgressState.availableLocations, location],
          exploredLocations: [...updatedProgressState.exploredLocations, location.name]
        });
      } else if (!existingLocation.isExplored) {
        // Update existing location to explored
        const updatedLocations = updatedProgressState.availableLocations.map(l =>
          l.id === existingLocation.id ? { ...l, isExplored: true } : l
        );
        const updatedExplored = updatedProgressState.exploredLocations.includes(location.name)
          ? updatedProgressState.exploredLocations
          : [...updatedProgressState.exploredLocations, location.name];
        
        updatedProgressState = updateProgressState(updatedProgressState, {
          availableLocations: updatedLocations,
          exploredLocations: updatedExplored
        });
      }
    });
    
    // Add interaction events
    updatedProgressState = updateProgressState(updatedProgressState, {
      interactionHistory: [...updatedProgressState.interactionHistory, ...detection.interactions]
    });
    
    // Update progress calculations
    const finalProgressState = updateAllProgressPercentages(updatedProgressState);
    
    // Also update legacy arrays for backward compatibility
    const legacyClues = [...gameState.clues];
    const legacySuspects = [...gameState.suspects];
    const legacyLocations = [...gameState.locations];
    
    // Add new items to legacy arrays
    detection.clues.forEach(clue => {
      if (!legacyClues.some(existing => existing.toLowerCase().includes(clue.text.toLowerCase()))) {
        legacyClues.push(clue.text);
      }
    });
    
    detection.suspects.forEach(suspect => {
      if (!legacySuspects.some(existing => existing.toLowerCase() === suspect.name.toLowerCase())) {
        legacySuspects.push(suspect.name);
      }
    });
    
    detection.locations.forEach(location => {
      if (!legacyLocations.some(existing => existing.toLowerCase() === location.name.toLowerCase())) {
        legacyLocations.push(location.name);
      }
    });
    
    return updateGameState(gameState, {
      progressState: finalProgressState,
      clues: legacyClues,
      suspects: legacySuspects,
      locations: legacyLocations
    });
    
  } catch (error) {
    console.warn('Progress detection failed:', error);
    return gameState;
  }
};

// Sync legacy game state arrays with progress state
export const syncLegacyStateWithProgress = (gameState: GameState): GameState => {
  const { clues, suspects, locations } = gameState;
  let updatedProgressState = gameState.progressState;
  
  // Sync clues - add any new clues from legacy state to progress state
  const existingClueTexts = updatedProgressState.discoveredClues.map(c => c.text);
  const newClues = clues.filter(clue => !existingClueTexts.includes(clue));
  
  newClues.forEach(clueText => {
    const newClue = {
      id: `clue-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      text: clueText,
      timestamp: new Date(),
      isCritical: false,
      category: 'other' as const
    };
    updatedProgressState = updateProgressState(updatedProgressState, {
      discoveredClues: [...updatedProgressState.discoveredClues, newClue]
    });
  });
  
  // Sync suspects - add any new suspects from legacy state
  const existingSuspectNames = updatedProgressState.knownSuspects.map(s => s.name.toLowerCase());
  const newSuspects = suspects.filter(suspect => 
    !existingSuspectNames.includes(suspect.toLowerCase())
  );
  
  newSuspects.forEach(suspectName => {
    const newSuspect = {
      id: `suspect-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: suspectName,
      isInterviewed: false,
      suspicionLevel: 'low' as const,
      notes: []
    };
    updatedProgressState = updateProgressState(updatedProgressState, {
      knownSuspects: [...updatedProgressState.knownSuspects, newSuspect]
    });
  });
  
  // Sync locations - add any new locations from legacy state
  const existingLocationNames = updatedProgressState.availableLocations.map(l => l.name.toLowerCase());
  const newLocations = locations.filter(location => 
    !existingLocationNames.includes(location.toLowerCase())
  );
  
  newLocations.forEach(locationName => {
    const newLocation = {
      id: `location-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: locationName,
      isExplored: true, // Assume explored if it's in the legacy state
      isFullySearched: false,
      evidenceFound: []
    };
    updatedProgressState = updateProgressState(updatedProgressState, {
      availableLocations: [...updatedProgressState.availableLocations, newLocation],
      exploredLocations: [...updatedProgressState.exploredLocations, locationName]
    });
  });
  
  // Update progress calculations
  const finalProgressState = updateAllProgressPercentages(updatedProgressState);
  
  return updateGameState(gameState, { progressState: finalProgressState });
};