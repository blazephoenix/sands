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

export const extractGameInfo = (message: string): {
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