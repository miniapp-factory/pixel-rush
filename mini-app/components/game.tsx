"use client";

import { useEffect, useRef, useState } from "react";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const gameLoop = () => {
      // clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // TODO: draw player, coins, obstacles
      // TODO: update positions, collision detection
      // TODO: update score
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    if (gameState === 'playing') {
      animationFrameId = requestAnimationFrame(gameLoop);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState]);

  const startGame = () => setGameState('playing');
  const endGame = () => setGameState('gameover');

  return (
    <div className="relative w-full h-full">
      {gameState === 'menu' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white">
          <h1 className="text-4xl mb-4">Pixel Rush</h1>
          <button onClick={startGame} className="px-4 py-2 bg-blue-500 rounded">Play</button>
        </div>
      )}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white">
          <h1 className="text-4xl mb-4">Game Over</h1>
          <p className="mb-4">Score: {score}</p>
          <button onClick={startGame} className="px-4 py-2 bg-blue-500 rounded">Replay</button>
        </div>
      )}
      <canvas ref={canvasRef} width={800} height={600} className="bg-gray-800" />
    </div>
  );
}
