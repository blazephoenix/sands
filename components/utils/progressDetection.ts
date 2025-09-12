// Advanced AI message parsing for progress detection in murder mystery game

import { ClueItem, SuspectItem, LocationItem, InteractionEvent } from './progressState';

export interface ProgressDetectionResult {
  clues: ClueItem[];
  suspects: SuspectItem[];
  locations: LocationItem[];
  interactions: InteractionEvent[];
  confidence: number; // Overall confidence score 0-1
}

export interface DetectionContext {
  currentLocation?: string;
  gamePhase: 'welcome' | 'setup' | 'investigation' | 'ended';
  previousMessage?: string;
  messageIndex: number;
}

// Enhanced clue detection patterns with confidence scoring
const CLUE_PATTERNS = [
  // Direct clue mentions
  { pattern: /(?:you (?:find|discover|notice|see|spot))\s+(a|an|the)?\s*([a-zA-Z][^.!?]{8,}?)(?:\.|!|\?|$)/gi, confidence: 0.9, category: 'discovery' },
  { pattern: /(?:clue|evidence|proof)(?:\s+(?:suggests?|indicates?|shows?|reveals?))?\s*:?\s*([a-zA-Z][^.!?]{5,})/gi, confidence: 0.95, category: 'explicit' },
  { pattern: /(?:it appears?|it seems?|apparently|evidently|clearly)\s+([a-zA-Z][^.!?]{10,})/gi, confidence: 0.7, category: 'inference' },
  
  // Physical evidence patterns - more specific
  { pattern: /(?:bloody|murder)\s+(knife|weapon|gun|rope|poison)/gi, confidence: 0.95, category: 'physical' },
  { pattern: /(?:find|found|discover|discovered)\s+(?:a|an|the)?\s*(knife|weapon|gun|rope|poison|note|letter|diary|key|document|photograph)/gi, confidence: 0.9, category: 'physical' },
  
  // Contextual clues
  { pattern: /(?:suspicious|strange|odd|unusual|interesting|notable|significant)\s+([a-zA-Z][^.!?]{8,})/gi, confidence: 0.6, category: 'observation' },
  { pattern: /(?:clear|strong|obvious)\s+motive/gi, confidence: 0.8, category: 'motive' },
  { pattern: /(?:alibi|whereabouts)(?:\s+(?:is|was))?\s+([a-zA-Z][^.!?]{8,})/gi, confidence: 0.8, category: 'alibi' },
  { pattern: /(?:opportunity|chance)\s+to\s+([a-zA-Z][^.!?]{8,})/gi, confidence: 0.75, category: 'opportunity' },
  
  // Time and sequence clues
  { pattern: /at\s+(\d+(?::\d+)?(?:\s*(?:am|pm|AM|PM))?)[^.!?]*?(was|were|saw|heard|did)\s+([a-zA-Z][^.!?]{8,})/gi, confidence: 0.8, category: 'timeline' },
  { pattern: /(?:yesterday|today|tonight|this morning|this evening|last night)\s+([a-zA-Z][^.!?]{8,})/gi, confidence: 0.7, category: 'timeline' }
];

// Suspect detection patterns
const SUSPECT_PATTERNS = [
  // Direct introductions - fixed pattern
  { pattern: /(?:meet|this is|let me introduce)(?:\s+you\s+to)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi, confidence: 0.9 },
  { pattern: /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is|was|seems?|appears?)\s+(?:a|an|the)\s+([^.!?]+)/gi, confidence: 0.8 },
  
  // Names in dialogue or descriptions
  { pattern: /"[^"]*?"\s*(?:says?|said|tells?|told|explains?|explained|mentions?|mentioned)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi, confidence: 0.85 },
  { pattern: /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:says?|said|tells?|told|explains?|explained|mentions?|mentioned)/gi, confidence: 0.85 },
  
  // Possessive or descriptive
  { pattern: /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)'s\s+([^.!?]+)/gi, confidence: 0.7 },
  { pattern: /(?:according to|as per)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi, confidence: 0.8 },
  
  // Suspect mentions
  { pattern: /(?:suspect|person)\s+(?:is|was|named)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi, confidence: 0.9 }
];

// Location detection patterns
const LOCATION_PATTERNS = [
  // Direct location mentions
  { pattern: /(?:you (?:enter|go to|visit|are in|move to)|in the|at the|from the)\s+([a-zA-Z][^.!?]*?(?:room|hall|kitchen|library|garden|study|deck|cabin|car|compartment|area|space))/gi, confidence: 0.9 },
  { pattern: /(?:location|place|area|room|space)(?:\s+(?:is|called))?\s*:?\s*([a-zA-Z][^.!?]{3,})/gi, confidence: 0.85 },
  
  // Contextual location references
  { pattern: /(?:here in|while in|inside|outside)\s+(?:the\s+)?([a-zA-Z][^.!?]{3,}?)(?:\s+(?:room|hall|area|space))?/gi, confidence: 0.7 },
  { pattern: /(?:upstairs|downstairs|nearby|adjacent)\s+(?:in\s+)?(?:the\s+)?([a-zA-Z][^.!?]{3,})/gi, confidence: 0.6 }
];

// Interview detection patterns
const INTERVIEW_PATTERNS = [
  { pattern: /(?:you (?:speak|talk|interview|question|ask)|conversation with|speaking (?:to|with))\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi, confidence: 0.9 },
  { pattern: /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:tells?|explains?|reveals?|admits?|confesses?|denies?)\s+(?:you|that)/gi, confidence: 0.85 },
  { pattern: /(?:interview|questioned?|spoke (?:to|with))\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi, confidence: 0.9 }
];

// Clean and validate extracted text
const cleanExtractedText = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(?:that|the|a|an)\s+/i, '')
    .replace(/\s*[.!?]*$/, '');
};

// Generate unique ID for items
const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

// Detect clues from AI message
export const detectClues = (
  message: string, 
  context: DetectionContext
): { clues: ClueItem[]; confidence: number } => {
  const detectedClues: ClueItem[] = [];
  let totalConfidence = 0;
  let patternMatches = 0;

  CLUE_PATTERNS.forEach(({ pattern, confidence, category }) => {
    const matches = Array.from(message.matchAll(pattern));
    
    matches.forEach(match => {
      let clueText = '';
      
      // Handle different pattern types
      if (category === 'timeline' && match[3]) {
        clueText = cleanExtractedText(match[3]);
      } else if (category === 'discovery' && match[2]) {
        clueText = cleanExtractedText(match[2]);
      } else if (category === 'physical' && match[1]) {
        clueText = cleanExtractedText(match[1]);
      } else if (match[1]) {
        clueText = cleanExtractedText(match[1]);
      } else {
        clueText = cleanExtractedText(match[0]);
      }
      
      // Skip very short or generic text
      if (clueText.length < 4 || /^(?:it|this|that|there|here|was|is|are|were|the|a|an)$/i.test(clueText)) {
        return;
      }
      
      // Check for duplicates
      const isDuplicate = detectedClues.some(existing => 
        existing.text.toLowerCase().includes(clueText.toLowerCase()) ||
        clueText.toLowerCase().includes(existing.text.toLowerCase())
      );
      
      if (!isDuplicate) {
        const clue: ClueItem = {
          id: generateId('clue'),
          text: clueText,
          timestamp: new Date(),
          location: context.currentLocation,
          isCritical: confidence > 0.8 && (category === 'motive' || category === 'physical'),
          category: mapCategoryToClueCategory(category)
        };
        
        detectedClues.push(clue);
        totalConfidence += confidence;
        patternMatches++;
      }
    });
  });

  const averageConfidence = patternMatches > 0 ? totalConfidence / patternMatches : 0;
  
  return {
    clues: detectedClues,
    confidence: Math.min(averageConfidence, 1)
  };
};

// Detect suspects from AI message
export const detectSuspects = (
  message: string,
  context: DetectionContext
): { suspects: SuspectItem[]; confidence: number } => {
  const detectedSuspects: SuspectItem[] = [];
  let totalConfidence = 0;
  let patternMatches = 0;

  SUSPECT_PATTERNS.forEach(({ pattern, confidence }) => {
    const matches = Array.from(message.matchAll(pattern));
    
    matches.forEach(match => {
      // Try different capture groups
      let suspectName = '';
      for (let i = 1; i < match.length; i++) {
        if (match[i] && /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(match[i].trim())) {
          suspectName = cleanExtractedText(match[i]);
          break;
        }
      }
      
      // Validate suspect name (should be proper name format)
      if (!suspectName || !/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(suspectName) || suspectName.length < 2) {
        return;
      }
      
      // Check for duplicates
      const isDuplicate = detectedSuspects.some(existing => 
        existing.name.toLowerCase() === suspectName.toLowerCase()
      );
      
      if (!isDuplicate) {
        const suspect: SuspectItem = {
          id: generateId('suspect'),
          name: suspectName,
          isInterviewed: false,
          suspicionLevel: 'low',
          notes: []
        };
        
        detectedSuspects.push(suspect);
        totalConfidence += confidence;
        patternMatches++;
      }
    });
  });

  const averageConfidence = patternMatches > 0 ? totalConfidence / patternMatches : 0;
  
  return {
    suspects: detectedSuspects,
    confidence: Math.min(averageConfidence, 1)
  };
};

// Detect locations from AI message
export const detectLocations = (
  message: string,
  context: DetectionContext
): { locations: LocationItem[]; confidence: number } => {
  const detectedLocations: LocationItem[] = [];
  let totalConfidence = 0;
  let patternMatches = 0;

  LOCATION_PATTERNS.forEach(({ pattern, confidence }) => {
    const matches = Array.from(message.matchAll(pattern));
    
    matches.forEach(match => {
      const locationName = cleanExtractedText(match[1]);
      
      // Skip very short or generic locations
      if (locationName.length < 3 || /^(?:it|this|that|there|here|place|was|is|are|were|and|the)$/i.test(locationName)) {
        return;
      }
      
      // Skip if it looks like a sentence fragment rather than a location
      if (locationName.includes(' and ') || locationName.includes(' or ') || locationName.includes(' but ')) {
        return;
      }
      
      // Check for duplicates
      const isDuplicate = detectedLocations.some(existing => 
        existing.name.toLowerCase() === locationName.toLowerCase()
      );
      
      if (!isDuplicate) {
        const location: LocationItem = {
          id: generateId('location'),
          name: locationName,
          isExplored: true, // Assume explored if mentioned
          isFullySearched: false,
          evidenceFound: []
        };
        
        detectedLocations.push(location);
        totalConfidence += confidence;
        patternMatches++;
      }
    });
  });

  const averageConfidence = patternMatches > 0 ? totalConfidence / patternMatches : 0;
  
  return {
    locations: detectedLocations,
    confidence: Math.min(averageConfidence, 1)
  };
};

// Detect interviews from AI message
export const detectInterviews = (
  message: string,
  context: DetectionContext
): { interviewedSuspects: string[]; confidence: number } => {
  const interviewedSuspects: string[] = [];
  let totalConfidence = 0;
  let patternMatches = 0;

  INTERVIEW_PATTERNS.forEach(({ pattern, confidence }) => {
    const matches = Array.from(message.matchAll(pattern));
    
    matches.forEach(match => {
      // Try different capture groups
      let suspectName = '';
      for (let i = 1; i < match.length; i++) {
        if (match[i] && /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(match[i].trim())) {
          suspectName = cleanExtractedText(match[i]);
          break;
        }
      }
      
      // Validate suspect name
      if (!suspectName || !/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(suspectName) || suspectName.length < 2) {
        return;
      }
      
      // Check for duplicates
      if (!interviewedSuspects.includes(suspectName)) {
        interviewedSuspects.push(suspectName);
        totalConfidence += confidence;
        patternMatches++;
      }
    });
  });

  const averageConfidence = patternMatches > 0 ? totalConfidence / patternMatches : 0;
  
  return {
    interviewedSuspects,
    confidence: Math.min(averageConfidence, 1)
  };
};

// Map detection categories to clue categories
const mapCategoryToClueCategory = (category: string): ClueItem['category'] => {
  const categoryMap: Record<string, ClueItem['category']> = {
    'motive': 'motive',
    'opportunity': 'opportunity',
    'physical': 'means',
    'alibi': 'alibi',
    'discovery': 'other',
    'inference': 'other',
    'observation': 'other',
    'timeline': 'other'
  };
  
  return categoryMap[category] || 'other';
};

// Main progress detection function
export const detectProgressFromMessage = (
  message: string,
  context: DetectionContext
): ProgressDetectionResult => {
  const clueDetection = detectClues(message, context);
  const suspectDetection = detectSuspects(message, context);
  const locationDetection = detectLocations(message, context);
  const interviewDetection = detectInterviews(message, context);
  
  // Create interaction events
  const interactions: InteractionEvent[] = [];
  
  // Add clue discovery events
  clueDetection.clues.forEach(clue => {
    interactions.push({
      type: 'clue_discovered',
      timestamp: new Date(),
      details: { clueId: clue.id, text: clue.text, location: clue.location }
    });
  });
  
  // Add suspect interview events
  interviewDetection.interviewedSuspects.forEach(suspectName => {
    interactions.push({
      type: 'suspect_interviewed',
      timestamp: new Date(),
      details: { suspectName }
    });
  });
  
  // Add location exploration events
  locationDetection.locations.forEach(location => {
    interactions.push({
      type: 'location_explored',
      timestamp: new Date(),
      details: { locationName: location.name, isExplored: true }
    });
  });
  
  // Calculate overall confidence
  const confidenceScores = [
    clueDetection.confidence,
    suspectDetection.confidence,
    locationDetection.confidence,
    interviewDetection.confidence
  ].filter(score => score > 0);
  
  const overallConfidence = confidenceScores.length > 0
    ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
    : 0;
  
  return {
    clues: clueDetection.clues,
    suspects: suspectDetection.suspects,
    locations: locationDetection.locations,
    interactions,
    confidence: overallConfidence
  };
};

// Enhanced extraction function that replaces the basic one in gameState.ts
export const extractGameInfoEnhanced = (
  message: string,
  context: DetectionContext
): {
  clues?: string[];
  suspects?: string[];
  locations?: string[];
  evidence?: string[];
  confidence: number;
} => {
  const detection = detectProgressFromMessage(message, context);
  
  return {
    clues: detection.clues.map(clue => clue.text),
    suspects: detection.suspects.map(suspect => suspect.name),
    locations: detection.locations.map(location => location.name),
    evidence: detection.clues.filter(clue => clue.category === 'means').map(clue => clue.text),
    confidence: detection.confidence
  };
};