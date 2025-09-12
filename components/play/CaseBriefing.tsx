import React from 'react';
import { GameState } from '../utils/gameState';

interface CaseBriefingProps {
  gameState: GameState;
}

const CaseBriefing: React.FC<CaseBriefingProps> = ({ gameState }) => {
  if (gameState.phase === 'welcome') {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 sticky top-20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center">
          <span className="mr-2">📋</span>
          {gameState.phase === 'setup' ? 'Case Setup' : 'Case Briefing'}
        </h3>
        <div className="flex items-center space-x-4">
          <div className="text-sm">
            <span className="text-slate-500">Score:</span>
            <span className="ml-1 font-semibold text-orange-600">{gameState.score}</span>
          </div>
          <div className="text-sm">
            <span className="text-slate-500">Actions:</span>
            <span className="ml-1 font-semibold text-slate-700">{gameState.actionsCount}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Case Details */}
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">📍 Case Details</h4>
            <div className="space-y-1 text-sm">
              {gameState.setting ? (
                <div className="flex justify-between">
                  <span className="text-slate-500">Location:</span>
                  <span className="text-slate-900">{gameState.setting}</span>
                </div>
              ) : gameState.phase === 'setup' && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Location:</span>
                  <span className="text-slate-400 italic">Pending selection...</span>
                </div>
              )}
              {gameState.suspectCount ? (
                <div className="flex justify-between">
                  <span className="text-slate-500">Suspects:</span>
                  <span className="text-slate-900">{gameState.suspectCount} people</span>
                </div>
              ) : gameState.phase === 'setup' && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Suspects:</span>
                  <span className="text-slate-400 italic">Pending selection...</span>
                </div>
              )}
              {gameState.phase === 'setup' && (
                <div className="mt-3 p-2 bg-orange-50 rounded text-xs text-orange-700">
                  💡 Complete the setup to begin your investigation
                </div>
              )}
            </div>
          </div>

          {/* Suspects */}
          {gameState.suspects.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">👥 Known Suspects</h4>
              <div className="space-y-1">
                {gameState.suspects.slice(0, 4).map((suspect, index) => (
                  <div key={index} className="text-xs bg-slate-50 rounded px-2 py-1">
                    {suspect}
                  </div>
                ))}
                {gameState.suspects.length > 4 && (
                  <div className="text-xs text-slate-500">
                    +{gameState.suspects.length - 4} more...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Evidence & Clues */}
        <div className="space-y-3">
          {/* Clues */}
          {gameState.clues.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">🔍 Discovered Clues</h4>
              <div className="space-y-1">
                {gameState.clues.slice(0, 3).map((clue, index) => (
                  <div key={index} className="text-xs bg-blue-50 rounded px-2 py-1 text-blue-800">
                    {clue}
                  </div>
                ))}
                {gameState.clues.length > 3 && (
                  <div className="text-xs text-slate-500">
                    +{gameState.clues.length - 3} more clues...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Evidence */}
          {gameState.evidence.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">🧪 Physical Evidence</h4>
              <div className="space-y-1">
                {gameState.evidence.slice(0, 3).map((evidence, index) => (
                  <div key={index} className="text-xs bg-orange-50 rounded px-2 py-1 text-orange-800">
                    {evidence}
                  </div>
                ))}
                {gameState.evidence.length > 3 && (
                  <div className="text-xs text-slate-500">
                    +{gameState.evidence.length - 3} more evidence...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Locations */}
          {gameState.locations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">🏠 Key Locations</h4>
              <div className="space-y-1">
                {gameState.locations.slice(0, 3).map((location, index) => (
                  <div key={index} className="text-xs bg-green-50 rounded px-2 py-1 text-green-800">
                    {location}
                  </div>
                ))}
                {gameState.locations.length > 3 && (
                  <div className="text-xs text-slate-500">
                    +{gameState.locations.length - 3} more locations...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Theories */}
      {gameState.theories.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <h4 className="text-sm font-medium text-slate-700 mb-2">💭 Working Theories</h4>
          <div className="space-y-1">
            {gameState.theories.map((theory, index) => (
              <div key={index} className="text-xs bg-purple-50 rounded px-2 py-1 text-purple-800">
                {theory}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game Status */}
      {gameState.phase === 'ended' && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className={`text-center p-3 rounded-lg ${
            gameState.gameResult === 'success' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <div className="font-semibold">
              {gameState.gameResult === 'success' ? '🎉 Case Solved!' : '❌ Case Failed'}
            </div>
            {gameState.endReason && (
              <div className="text-sm mt-1">{gameState.endReason}</div>
            )}
            <div className="text-sm mt-2">
              Final Score: <span className="font-bold">{gameState.score}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseBriefing;