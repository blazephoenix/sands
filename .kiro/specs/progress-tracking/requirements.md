# Requirements Document

## Introduction

This feature adds a progress tracking side panel to the Sands murder mystery game that displays the player's investigation progress in real-time. The panel will show discovered clues, interviewed suspects, explored locations, and overall case completion status to help players track their detective work and ensure they don't miss important elements of the mystery.

## Requirements

### Requirement 1

**User Story:** As a detective player, I want to see a visual progress tracker during gameplay, so that I can monitor my investigation progress and ensure I'm being thorough.

#### Acceptance Criteria

1. WHEN a game session starts THEN the system SHALL display a collapsible side panel with progress tracking sections
2. WHEN the panel is collapsed THEN the system SHALL show a compact progress indicator with overall completion percentage
3. WHEN the panel is expanded THEN the system SHALL show detailed progress across all investigation categories
4. WHEN the game is in progress THEN the system SHALL update progress indicators in real-time as the player discovers new information

### Requirement 2

**User Story:** As a detective player, I want to track discovered clues in the progress panel, so that I can reference important evidence without scrolling through chat history.

#### Acceptance Criteria

1. WHEN the AI mentions a clue in the conversation THEN the system SHALL automatically detect and add it to the "Clues Discovered" section
2. WHEN a clue is discovered THEN the system SHALL display the clue text with a timestamp and location context
3. WHEN multiple clues are discovered THEN the system SHALL organize them chronologically or by category
4. WHEN a clue is critical to solving the case THEN the system SHALL highlight it with a special indicator

### Requirement 3

**User Story:** As a detective player, I want to see which suspects I've interviewed, so that I can ensure I've spoken with everyone and track their alibis.

#### Acceptance Criteria

1. WHEN a suspect is introduced in the story THEN the system SHALL add them to the "Suspects" section with basic information
2. WHEN the player interacts with a suspect THEN the system SHALL mark them as "Interviewed" with a visual indicator
3. WHEN suspect information is revealed THEN the system SHALL update their profile with key details (motive, alibi, opportunity)
4. WHEN all suspects have been interviewed THEN the system SHALL show a completion indicator for this category

### Requirement 4

**User Story:** As a detective player, I want to track locations I've explored, so that I can systematically investigate all areas of the crime scene.

#### Acceptance Criteria

1. WHEN a location is mentioned or visited in the story THEN the system SHALL add it to the "Locations Explored" section
2. WHEN the player thoroughly investigates a location THEN the system SHALL mark it as "Fully Searched"
3. WHEN evidence is found at a location THEN the system SHALL link the evidence to that location in the progress tracker
4. WHEN all key locations have been explored THEN the system SHALL indicate investigation completeness

### Requirement 5

**User Story:** As a detective player, I want to see an overall progress percentage, so that I can gauge how close I am to solving the mystery.

#### Acceptance Criteria

1. WHEN the game calculates progress THEN the system SHALL compute a percentage based on clues found, suspects interviewed, and locations explored
2. WHEN progress increases THEN the system SHALL update the percentage with a smooth animation
3. WHEN progress reaches certain milestones THEN the system SHALL provide encouraging feedback or hints
4. WHEN the case is near completion THEN the system SHALL indicate the player is ready to make an accusation

### Requirement 6

**User Story:** As a detective player, I want the progress panel to be responsive and non-intrusive, so that it enhances rather than disrupts my gameplay experience.

#### Acceptance Criteria

1. WHEN viewing on desktop THEN the system SHALL display the panel as a fixed sidebar that doesn't overlap the chat
2. WHEN viewing on mobile THEN the system SHALL display the panel as a collapsible overlay or bottom sheet
3. WHEN the panel is open THEN the system SHALL ensure the chat interface remains fully functional
4. WHEN the user wants to focus on conversation THEN the system SHALL allow easy hiding/showing of the progress panel

### Requirement 7

**User Story:** As a detective player, I want to access my progress history, so that I can review my investigation approach and learn from completed cases.

#### Acceptance Criteria

1. WHEN a case is completed THEN the system SHALL save the final progress state with case details
2. WHEN the player wants to review past cases THEN the system SHALL provide access to historical progress data
3. WHEN viewing case history THEN the system SHALL show completion time, clues found, and solution accuracy
4. IF the player solved the case correctly THEN the system SHALL highlight successful investigation patterns