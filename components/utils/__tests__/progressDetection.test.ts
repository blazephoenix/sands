// Unit tests for progress detection functionality

import {
  detectClues,
  detectSuspects,
  detectLocations,
  detectInterviews,
  detectProgressFromMessage,
  extractGameInfoEnhanced,
} from "../progressDetection";
import { DetectionContext } from "../progressDetection";

// Mock detection context
const mockContext: DetectionContext = {
  currentLocation: "Library",
  gamePhase: "investigation",
  messageIndex: 1,
};

describe("Progress Detection", () => {
  describe("detectClues", () => {
    it("should detect explicit clues with high confidence", () => {
      const message =
        "You find a bloody knife hidden under the desk. The clue suggests the murder weapon was a kitchen knife.";
      const result = detectClues(message, mockContext);

      expect(result.clues.length).toBeGreaterThan(0);
      expect(result.clues.some(clue => clue.text.includes('knife'))).toBe(true);
      expect(result.clues.some(clue => clue.isCritical)).toBe(true);
      expect(result.clues.some(clue => clue.category === 'means')).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should detect motive clues", () => {
      const message =
        "The victim had recently changed his will, leaving everything to his nephew. This gives John a clear motive for murder.";
      const result = detectClues(message, mockContext);

      expect(result.clues.length).toBeGreaterThan(0);
      expect(result.clues.some((clue) => clue.category === "motive")).toBe(
        true
      );
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("should detect timeline clues", () => {
      const message =
        "At 10:30 PM, the victim was seen arguing with someone in the garden.";
      const result = detectClues(message, mockContext);

      expect(result.clues).toHaveLength(1);
      expect(result.clues[0].category).toBe("other");
      expect(result.clues[0].text).toContain("arguing");
    });

    it("should skip very short or generic text", () => {
      const message = "It is here. That was it.";
      const result = detectClues(message, mockContext);

      expect(result.clues).toHaveLength(0);
    });

    it("should avoid duplicate clues", () => {
      const message =
        "You find a bloody knife. The bloody knife is the murder weapon.";
      const result = detectClues(message, mockContext);

      expect(result.clues).toHaveLength(1);
    });
  });

  describe("detectSuspects", () => {
    it("should detect suspect introductions", () => {
      const message =
        "Let me introduce you to Margaret Thompson, the victim's sister.";
      const result = detectSuspects(message, mockContext);

      expect(result.suspects).toHaveLength(1);
      expect(result.suspects[0].name).toBe("Margaret Thompson");
      expect(result.suspects[0].suspicionLevel).toBe("low");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should detect suspects in dialogue", () => {
      const message =
        '"I was in my room all evening," says Robert Wilson nervously.';
      const result = detectSuspects(message, mockContext);

      expect(result.suspects).toHaveLength(1);
      expect(result.suspects[0].name).toBe("Robert Wilson");
    });

    it("should validate proper name format", () => {
      const message = "The suspect is someone and they were there.";
      const result = detectSuspects(message, mockContext);

      expect(result.suspects).toHaveLength(0);
    });

    it("should avoid duplicate suspects", () => {
      const message =
        "John Smith says he was innocent. John Smith appears nervous.";
      const result = detectSuspects(message, mockContext);

      expect(result.suspects).toHaveLength(1);
      expect(result.suspects[0].name).toBe("John Smith");
    });
  });

  describe("detectLocations", () => {
    it("should detect room mentions", () => {
      const message =
        "You enter the dining room and notice the table is set for dinner.";
      const result = detectLocations(message, mockContext);

      expect(result.locations).toHaveLength(1);
      expect(result.locations[0].name).toContain("dining room");
      expect(result.locations[0].isExplored).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should detect multiple locations", () => {
      const message = "From the kitchen, you can see into the garden area.";
      const result = detectLocations(message, mockContext);

      expect(result.locations.length).toBeGreaterThanOrEqual(1);
    });

    it("should skip generic location references", () => {
      const message = "It is here and that place was there.";
      const result = detectLocations(message, mockContext);

      expect(result.locations).toHaveLength(0);
    });
  });

  describe("detectInterviews", () => {
    it("should detect interview activities", () => {
      const message =
        "You speak with Sarah Johnson about her whereabouts last night.";
      const result = detectInterviews(message, mockContext);

      expect(result.interviewedSuspects).toHaveLength(1);
      expect(result.interviewedSuspects[0]).toBe("Sarah Johnson");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should detect when suspects reveal information", () => {
      const message = "Michael Davis tells you that he saw the victim at 9 PM.";
      const result = detectInterviews(message, mockContext);

      expect(result.interviewedSuspects).toHaveLength(1);
      expect(result.interviewedSuspects[0]).toBe("Michael Davis");
    });
  });

  describe("detectProgressFromMessage", () => {
    it("should detect comprehensive progress from complex message", () => {
      const message = `
        You enter the study and meet Professor Williams, who appears nervous.
        "I was in the library at 10 PM," he tells you defensively.
        You discover a torn letter in the wastebasket - it appears to be a threatening note.
        The evidence suggests someone had a strong motive to harm the victim.
      `;

      const result = detectProgressFromMessage(message, mockContext);

      expect(result.clues.length).toBeGreaterThan(0);
      expect(result.suspects.length).toBeGreaterThan(0);
      expect(result.locations.length).toBeGreaterThan(0);
      expect(result.interactions.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should create appropriate interaction events", () => {
      const message =
        "You find a key and interview Detective Brown in the hallway.";
      const result = detectProgressFromMessage(message, mockContext);

      const clueEvents = result.interactions.filter(
        (i) => i.type === "clue_discovered"
      );
      const interviewEvents = result.interactions.filter(
        (i) => i.type === "suspect_interviewed"
      );
      const locationEvents = result.interactions.filter(
        (i) => i.type === "location_explored"
      );

      expect(clueEvents.length).toBeGreaterThan(0);
      expect(interviewEvents.length).toBeGreaterThan(0);
      expect(locationEvents.length).toBeGreaterThan(0);
    });

    it("should handle empty or irrelevant messages", () => {
      const message = "Hello there. How are you today?";
      const result = detectProgressFromMessage(message, mockContext);

      expect(result.clues).toHaveLength(0);
      expect(result.suspects).toHaveLength(0);
      expect(result.locations).toHaveLength(0);
      expect(result.confidence).toBeLessThan(0.3);
    });
  });

  describe("extractGameInfoEnhanced", () => {
    it("should return formatted game info with confidence", () => {
      const message =
        "You discover a bloody dagger and meet suspect Alice Cooper in the kitchen.";
      const result = extractGameInfoEnhanced(message, mockContext);

      expect(result.clues).toBeDefined();
      expect(result.suspects).toBeDefined();
      expect(result.locations).toBeDefined();
      expect(result.evidence).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(typeof result.confidence).toBe("number");
    });

    it("should separate evidence from general clues", () => {
      const message =
        "You find a murder weapon and notice the victim had a motive to blackmail someone.";
      const result = extractGameInfoEnhanced(message, mockContext);

      expect(result.evidence?.length).toBeGreaterThan(0);
      expect(result.clues?.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long messages", () => {
      const longMessage =
        "You investigate the scene. ".repeat(100) +
        "You find a clue about the murder.";
      const result = detectProgressFromMessage(longMessage, mockContext);

      expect(result.clues.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should handle messages with special characters", () => {
      const message =
        "You find a note: 'Meet me at 10:30 PM - J.S.' The handwriting suggests urgency!";
      const result = detectProgressFromMessage(message, mockContext);

      expect(result.clues.length).toBeGreaterThan(0);
    });

    it("should handle mixed case and punctuation", () => {
      const message =
        "YOU DISCOVER A BLOODY KNIFE!!! The SUSPECT is JOHN SMITH... in the KITCHEN!!!";
      const result = detectProgressFromMessage(message, mockContext);

      expect(result.clues.length).toBeGreaterThan(0);
      expect(result.suspects.length).toBeGreaterThan(0);
      expect(result.locations.length).toBeGreaterThan(0);
    });
  });

  describe("Confidence Scoring", () => {
    it("should give high confidence for explicit patterns", () => {
      const message =
        "Clue: The murder weapon is a knife. Evidence: Fingerprints on the handle.";
      const result = detectProgressFromMessage(message, mockContext);

      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should give lower confidence for ambiguous patterns", () => {
      const message =
        "It seems like something might have happened here, apparently.";
      const result = detectProgressFromMessage(message, mockContext);

      expect(result.confidence).toBeLessThan(0.7);
    });

    it("should give zero confidence for no matches", () => {
      const message = "The weather is nice today.";
      const result = detectProgressFromMessage(message, mockContext);

      expect(result.confidence).toBe(0);
    });
  });
});
