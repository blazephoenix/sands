// Unit tests for enhanced gameState functionality

import {
  extractGameInfo,
  processMessageForProgress,
  GameState,
  initialGameState,
} from "../gameState";
import { initialProgressState } from "../progressState";

// Mock game state for testing
const mockGameState: GameState = {
  ...initialGameState,
  phase: "investigation",
  progressState: {
    ...initialProgressState,
    availableLocations: [
      {
        id: "loc-1",
        name: "Library",
        isExplored: true,
        isFullySearched: false,
        evidenceFound: [],
      },
    ],
  },
};

describe("Enhanced Game State Functions", () => {
  describe("extractGameInfo", () => {
    it("should extract game info with enhanced detection", () => {
      const message =
        "You discover a bloody knife in the kitchen and meet suspect John Doe.";
      const result = extractGameInfo(message, mockGameState, 1);

      expect(result.clues).toBeDefined();
      expect(result.suspects).toBeDefined();
      expect(result.locations).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(typeof result.confidence).toBe("number");
    });

    it("should fall back to simple patterns on low confidence", () => {
      const message = "Clue: Simple pattern. Suspect: Basic detection.";
      const result = extractGameInfo(message, mockGameState, 1);

      expect(result.clues).toContain("Simple pattern");
      expect(result.suspects).toContain("Basic detection");
    });

    it("should handle extraction errors gracefully", () => {
      const message = "Normal conversation without game elements.";
      const result = extractGameInfo(message, mockGameState, 1);

      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it("should work without game state context", () => {
      const message = "You find evidence in the study.";
      const result = extractGameInfo(message);

      expect(result).toBeDefined();
    });
  });

  describe("processMessageForProgress", () => {
    it("should update progress state with detected elements", () => {
      const message =
        "You discover a murder weapon and interview suspect Mary Johnson in the dining room.";
      const result = processMessageForProgress(mockGameState, message, 1);

      expect(result.progressState.discoveredClues.length).toBeGreaterThan(
        mockGameState.progressState.discoveredClues.length
      );
      expect(result.progressState.knownSuspects.length).toBeGreaterThan(
        mockGameState.progressState.knownSuspects.length
      );
      expect(result.progressState.availableLocations.length).toBeGreaterThan(
        mockGameState.progressState.availableLocations.length
      );
    });

    it("should update legacy arrays for backward compatibility", () => {
      const message = "You find a key clue and meet Detective Smith.";
      const result = processMessageForProgress(mockGameState, message, 1);

      expect(result.clues.length).toBeGreaterThan(mockGameState.clues.length);
      expect(result.suspects.length).toBeGreaterThan(
        mockGameState.suspects.length
      );
    });

    it("should avoid duplicate clues", () => {
      const stateWithClues: GameState = {
        ...mockGameState,
        progressState: {
          ...mockGameState.progressState,
          discoveredClues: [
            {
              id: "clue-1",
              text: "bloody knife found in kitchen",
              timestamp: new Date(),
              isCritical: true,
              category: "means",
            },
          ],
        },
      };

      const message = "You see the bloody knife in the kitchen again.";
      const result = processMessageForProgress(stateWithClues, message, 1);

      // Should not add duplicate clue
      expect(result.progressState.discoveredClues.length).toBe(1);
    });

    it("should avoid duplicate suspects", () => {
      const stateWithSuspects: GameState = {
        ...mockGameState,
        progressState: {
          ...mockGameState.progressState,
          knownSuspects: [
            {
              id: "suspect-1",
              name: "John Smith",
              isInterviewed: false,
              suspicionLevel: "low",
              notes: [],
            },
          ],
        },
      };

      const message = "John Smith tells you about his alibi.";
      const result = processMessageForProgress(stateWithSuspects, message, 1);

      // Should not add duplicate suspect
      expect(result.progressState.knownSuspects.length).toBe(1);
    });

    it("should update existing location exploration status", () => {
      const stateWithLocation: GameState = {
        ...mockGameState,
        progressState: {
          ...mockGameState.progressState,
          availableLocations: [
            {
              id: "loc-1",
              name: "Kitchen",
              isExplored: false,
              isFullySearched: false,
              evidenceFound: [],
            },
          ],
        },
      };

      const message = "You enter the kitchen and search thoroughly.";
      const result = processMessageForProgress(stateWithLocation, message, 1);

      const kitchen = result.progressState.availableLocations.find(
        (l) => l.name === "Kitchen"
      );
      expect(kitchen?.isExplored).toBe(true);
      expect(result.progressState.exploredLocations).toContain("Kitchen");
    });

    it("should add interaction events", () => {
      const message = "You discover evidence and interview a suspect.";
      const result = processMessageForProgress(mockGameState, message, 1);

      expect(result.progressState.interactionHistory.length).toBeGreaterThan(
        mockGameState.progressState.interactionHistory.length
      );
    });

    it("should update progress calculations", () => {
      const message = "You find multiple clues and interview several suspects.";
      const result = processMessageForProgress(mockGameState, message, 1);

      expect(result.progressState.overallProgress).toBeGreaterThanOrEqual(0);
      expect(result.progressState.clueProgress).toBeGreaterThanOrEqual(0);
      expect(result.progressState.suspectProgress).toBeGreaterThanOrEqual(0);
      expect(result.progressState.locationProgress).toBeGreaterThanOrEqual(0);
    });

    it("should handle detection errors gracefully", () => {
      const message = "This message might cause an error in detection.";
      const result = processMessageForProgress(mockGameState, message, 1);

      // Should return original state if detection fails
      expect(result).toBeDefined();
      expect(result.phase).toBe(mockGameState.phase);
    });

    it("should maintain game state integrity", () => {
      const message = "Complex message with multiple elements.";
      const result = processMessageForProgress(mockGameState, message, 1);

      // Verify all required properties are maintained
      expect(result.phase).toBeDefined();
      expect(result.progressState).toBeDefined();
      expect(result.clues).toBeDefined();
      expect(result.suspects).toBeDefined();
      expect(result.locations).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.actionsCount).toBeDefined();
    });
  });

  describe("Integration Tests", () => {
    it("should handle a complete investigation message", () => {
      const investigationMessage = `
        You enter the study and immediately notice something amiss. 
        Professor Williams is standing by the window, looking nervous.
        "I was in the library all evening," he tells you when you ask about his whereabouts.
        You discover a torn letter in the wastebasket - it appears to be a threatening note about money.
        The handwriting matches samples you've seen before.
        This gives Williams a clear motive for the murder.
      `;

      const result = processMessageForProgress(
        mockGameState,
        investigationMessage,
        1
      );

      // Should detect multiple elements
      expect(result.progressState.discoveredClues.length).toBeGreaterThan(0);
      expect(result.progressState.knownSuspects.length).toBeGreaterThan(0);
      expect(result.progressState.availableLocations.length).toBeGreaterThan(
        mockGameState.progressState.availableLocations.length
      );

      // Should update progress percentages
      expect(result.progressState.overallProgress).toBeGreaterThan(0);

      // Should maintain legacy compatibility
      expect(result.clues.length).toBeGreaterThan(0);
      expect(result.suspects.length).toBeGreaterThan(0);
      expect(result.locations.length).toBeGreaterThan(0);
    });

    it("should handle multiple processing calls", () => {
      let currentState = mockGameState;

      const messages = [
        "You meet John Smith in the library.",
        "John Smith tells you about seeing Mary Johnson near the kitchen.",
        "You find a bloody knife in the kitchen drawer.",
        "Mary Johnson admits she was in the kitchen at 10 PM.",
      ];

      messages.forEach((message, index) => {
        currentState = processMessageForProgress(currentState, message, index);
      });

      // Should accumulate progress over multiple messages
      expect(currentState.progressState.discoveredClues.length).toBeGreaterThan(
        0
      );
      expect(currentState.progressState.knownSuspects.length).toBeGreaterThan(
        0
      );
      expect(
        currentState.progressState.interactionHistory.length
      ).toBeGreaterThan(0);
      expect(currentState.progressState.overallProgress).toBeGreaterThan(0);
    });
  });
});
