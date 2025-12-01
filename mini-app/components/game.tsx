"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const COIN_TYPES = [
  { id: "btc", name: "Bitcoin", color: "#f7931a", value: 1 },
  { id: "eth", name: "Ethereum", color: "#3c3c3d", value: 1 },
];

const MAX_COINS = 10; // max active coins on screen
const SPAWN_INTERVAL = 2000; // ms
const PLAYER_SPEED = 4;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

type Coin = {
  id: string;
  type: string;
  x: number;
  y: number;
  size: number;
  value: number;
};

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<
    "menu" | "playing" | "gameover"
  >("menu");
  const [player, setPlayer] = useState({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, size: 20 });
  const [coins, setCoins] = useState<Coin[]>([]);
  const [lastCoin, setLastCoin] = useState<Coin | null>(null);
  const [timeStart, setTimeStart] = useState<number | null>(null);
  const [prizePool, setPrizePool] = useState(0);

  // ---------- Input ----------
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      setPlayer((p) => {
        const newPos = { ...p };
        if (e.key === "ArrowUp" || e.key === "w") newPos.y -= PLAYER_SPEED;
        if (e.key === "ArrowDown" || e.key === "s") newPos.y += PLAYER_SPEED;
        if (e.key === "ArrowLeft" || e.key === "a") newPos.x -= PLAYER_SPEED;
        if (e.key === "ArrowRight" || e.key === "d") newPos.x += PLAYER_SPEED;
        // clamp to canvas
        newPos.x = Math.max(0, Math.min(CANVAS_WIDTH - p.size, newPos.x));
        newPos.y = Math.max(0, Math.min(CANVAS_HEIGHT - p.size, newPos.y));
        return newPos;
      });
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ---------- Coin spawning ----------
  useEffect(() => {
    if (gameState !== "playing") return;
    const interval = setInterval(() => {
      setCoins((c) => {
        if (c.length >= MAX_COINS) return c;
        const type = COIN_TYPES[Math.floor(Math.random() * COIN_TYPES.length)];
        const size = 12 + Math.floor(Math.random() * 8);
        const newCoin: Coin = {
          id: `${type.id}-${Date.now()}-${Math.random()}`,
          type: type.id,
          x: Math.random() * (CANVAS_WIDTH - size),
          y: Math.random() * (CANVAS_HEIGHT - size),
          size,
          value: type.value,
        };
        return [...c, newCoin];
      });
    }, SPAWN_INTERVAL);
    return () => clearInterval(interval);
  }, [gameState]);

  // ---------- Game loop ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const gameLoop = () => {
      // clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // draw player
      ctx.fillStyle = "#00ff00";
      ctx.fillRect(player.x, player.y, player.size, player.size);

      // draw coins
      coins.forEach((c) => {
        const coinType = COIN_TYPES.find((t) => t.id === c.type);
        ctx.fillStyle = coinType?.color ?? "#fff";
        ctx.beginPath();
        ctx.arc(c.x + c.size / 2, c.y + c.size / 2, c.size / 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // collision detection
      const remaining: Coin[] = [];
      coins.forEach((c) => {
        const dx = c.x + c.size / 2 - (player.x + player.size / 2);
        const dy = c.y + c.size / 2 - (player.y + player.size / 2);
        const dist = Math.hypot(dx, dy);
        if (dist < (c.size + player.size) / 2) {
          // collect
          setScore((s) => s + c.value * 10);
          setPrizePool((p) => p + c.value * 10);
          // merge logic
          if (lastCoin && lastCoin.type === c.type) {
            // merge into higher value
            const merged: Coin = {
              ...c,
              value: lastCoin.value + c.value,
              size: c.size + 2,
            };
            setLastCoin(merged);
            // replace last coin with merged
            setCoins((prev) => prev.filter((pc) => pc.id !== lastCoin.id));
          } else {
            setLastCoin(c);
          }
        } else {
          remaining.push(c);
        }
      });
      setCoins(remaining);

      // end condition: too many coins or time limit
      if (coins.length > MAX_COINS) {
        endGame();
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    if (gameState === "playing") {
      setTimeStart(Date.now());
      animationFrameId = requestAnimationFrame(gameLoop);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, coins, player, lastCoin]);

  const startGame = () => {
    setScore(0);
    setCoins([]);
    setLastCoin(null);
    setPrizePool(0);
    setGameState("playing");
  };

  const endGame = () => {
    setGameState("gameover");
    // store leaderboard
    const record = {
      name: prompt("Enter name:", "Player") ?? "Player",
      score,
      time: timeStart ? Date.now() - timeStart : 0,
      prize: prizePool,
    };
    const stored = JSON.parse(localStorage.getItem("leaderboard") ?? "[]");
    const updated = [...stored, record].sort((a, b) => b.score - a.score).slice(0, 5);
    localStorage.setItem("leaderboard", JSON.stringify(updated));
  };

  return (
    <div className="relative w-full h-full">
      {gameState === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white">
          <h1 className="text-4xl mb-4">Merge Coins</h1>
          <button onClick={startGame} className="px-4 py-2 bg-blue-500 rounded">
            Play
          </button>
        </div>
      )}
      {gameState === "gameover" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white">
          <h1 className="text-4xl mb-4">Game Over</h1>
          <p className="mb-2">Score: {score}</p>
          <p className="mb-2">Prize Pool: {prizePool}</p>
          <button onClick={startGame} className="px-4 py-2 bg-blue-500 rounded">
            Replay
          </button>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="bg-gray-800"
      />
    </div>
  );
}
