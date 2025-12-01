"use client";

import { useEffect, useRef, useState, useCallback } from "react";


const MAX_COINS = 12; // max active coins on screen
const INITIAL_SPAWN_INTERVAL = 2000; // ms
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
    "menu" | "instructions" | "playing" | "gameover" | "leaderboard" | "congrats"
  >("menu");
  const [player, setPlayer] = useState({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    size: 20,
  });
  const [coins, setCoins] = useState<Coin[]>([]);
  const [lastCoin, setLastCoin] = useState<Coin | null>(null);
  const [mergeFlash, setMergeFlash] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timeStart, setTimeStart] = useState<number | null>(null);
  const [prizePool, setPrizePool] = useState(0);
  const [leaderboard, setLeaderboard] = useState<
    { name: string; score: number; time: number; prize: number }[]
  >([]);
  const [spawnInterval, setSpawnInterval] = useState(INITIAL_SPAWN_INTERVAL);

  // ---------- Load leaderboard ----------
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("leaderboard") ?? "[]");
    setLeaderboard(stored);
  }, []);

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

  // ---------- Touch support ----------
  useEffect(() => {
    let lastTouchX: number | null = null;
    let lastTouchY: number | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (lastTouchX === null || lastTouchY === null) return;
      const touch = e.touches[0];
      const dx = touch.clientX - lastTouchX;
      const dy = touch.clientY - lastTouchY;
      setPlayer((p) => ({
        ...p,
        x: Math.max(0, Math.min(CANVAS_WIDTH - p.size, p.x + dx)),
        y: Math.max(0, Math.min(CANVAS_HEIGHT - p.size, p.y + dy)),
      }));
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;
    };

    const handleTouchEnd = () => {
      lastTouchX = null;
      lastTouchY = null;
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
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
    }, spawnInterval);
    return clearInterval(interval);
  }, [gameState, spawnInterval]);

  // ---------- Progressive difficulty ----------
  useEffect(() => {
    if (score > 300) setSpawnInterval(800);
    else if (score > 200) setSpawnInterval(1000);
    else if (score > 100) setSpawnInterval(1200);
  }, [score]);

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
      // draw grid background
      const gridSize = 40;
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 1;
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

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
        } else {
          remaining.push(c);
        }
      });
      setCoins(remaining);

      // end condition: too many coins
      if (coins.length > MAX_COINS) {
        endGame();
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    if (gameState === "playing") {
      animationFrameId = requestAnimationFrame(gameLoop);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, coins, player]);

  const startGame = () => {
    setScore(0);
    setCoins([]);
    setGameState("playing");
  };

  const endGame = () => {
    setGameState("gameover");
  };

  const showInstructions = () => setGameState("instructions");
  const showLeaderboard = () => setGameState("leaderboard");

  return (
    <div className="relative w-full h-full">
      {gameState === "menu" && (
        <div className="overlay">
          <h1 className="text-4xl mb-4">Pixel Rush – Crypto Merge</h1>
          <button onClick={startGame}>Play</button>
          <button onClick={showInstructions}>How to Play</button>
          <button onClick={showLeaderboard}>Leaderboard</button>
        </div>
      )}
      {gameState === "instructions" && (
        <div className="overlay">
          <h2 className="text-3xl mb-4">How to Play</h2>
          <p className="mb-2">
            Move the green square with arrow keys or touch. Collect gold coins
            to increase your score. Avoid red obstacles or your score will drop.
            If your score goes below zero, the game ends.
          </p>
          <button onClick={() => setGameState("menu")}>Back</button>
        </div>
      )}
      {gameState === "leaderboard" && (
        <div className="overlay">
          <h2 className="text-3xl mb-4">Leaderboard</h2>
          <ol className="text-left">
            {leaderboard.map((entry, idx) => (
              <li key={idx} className="mb-1">
                {idx + 1}. {entry.name} – {entry.score} pts
              </li>
            ))}
          </ol>
          <button onClick={() => setGameState("menu")}>Back</button>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="bg-gray-800"
      />
      {gameState === "playing" && (
        <div className="absolute top-4 left-4 text-white text-2xl">
          Score: {score}
        </div>
      )}
    </div>
  );
}

const COIN_TYPES = [
  { id: "btc", name: "Bitcoin", color: "#f7931a", value: 1 },
  { id: "eth", name: "Ethereum", color: "#3c3c3d", value: 1 },
  { id: "hny", name: "Honey", color: "#ffcc00", value: 2 },
  { id: "mem", name: "Memecoin", color: "#ff00ff", value: 3 },
  { id: "sol", name: "Solana", color: "#00ffff", value: 4 },
];

const MAX_COINS = 12; // max active coins on screen
const INITIAL_SPAWN_INTERVAL = 2000; // ms
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
    "menu" | "instructions" | "playing" | "gameover" | "leaderboard" | "congrats"
  >("menu");
  const [player, setPlayer] = useState({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    size: 20,
  });
  const [coins, setCoins] = useState<Coin[]>([]);
  const [lastCoin, setLastCoin] = useState<Coin | null>(null);
  const [mergeFlash, setMergeFlash] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timeStart, setTimeStart] = useState<number | null>(null);
  const [prizePool, setPrizePool] = useState(0);
  const [leaderboard, setLeaderboard] = useState<
    { name: string; score: number; time: number; prize: number }[]
  >([]);
  const [spawnInterval, setSpawnInterval] = useState(INITIAL_SPAWN_INTERVAL);

  // ---------- Load leaderboard ----------
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("leaderboard") ?? "[]");
    setLeaderboard(stored);
  }, []);

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

  // ---------- Touch support ----------
  useEffect(() => {
    let lastTouchX: number | null = null;
    let lastTouchY: number | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (lastTouchX === null || lastTouchY === null) return;
      const touch = e.touches[0];
      const dx = touch.clientX - lastTouchX;
      const dy = touch.clientY - lastTouchY;
      setPlayer((p) => ({
        ...p,
        x: Math.max(0, Math.min(CANVAS_WIDTH - p.size, p.x + dx)),
        y: Math.max(0, Math.min(CANVAS_HEIGHT - p.size, p.y + dy)),
      }));
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;
    };

    const handleTouchEnd = () => {
      lastTouchX = null;
      lastTouchY = null;
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
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
    }, spawnInterval);
    return () => clearInterval(interval);
  }, [gameState, spawnInterval]);

  // ---------- Progressive difficulty ----------
  useEffect(() => {
    if (score > 300) setSpawnInterval(800);
    else if (score > 200) setSpawnInterval(1000);
    else if (score > 100) setSpawnInterval(1200);
  }, [score]);

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
      // draw grid background
      const gridSize = 40;
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 1;
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

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
            // trigger merge flash
            setMergeFlash(true);
            setTimeout(() => setMergeFlash(false), 200);
          } else {
            setLastCoin(c);
          }
        } else {
          remaining.push(c);
        }
      });
      setCoins(remaining);

      // end condition: too many coins
      if (coins.length > MAX_COINS) {
        endGame();
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    if (gameState === "playing") {
      if (!timeStart) setTimeStart(Date.now());
      setTimeElapsed(Math.floor((Date.now() - (timeStart ?? Date.now())) / 1000));
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
    const updated = [...stored, record]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    localStorage.setItem("leaderboard", JSON.stringify(updated));
    setLeaderboard(updated);
  };

  const showInstructions = () => setGameState("instructions");
  const showLeaderboard = () => setGameState("leaderboard");
  const showCongrats = () => setGameState("congrats");

  return (
    <div className="relative w-full h-full">
      {gameState === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white">
          <h1 className="text-4xl mb-4">Pixel Rush – Crypto Merge</h1>
          <button
            onClick={startGame}
            className="px-4 py-2 bg-blue-500 rounded mb-2"
          >
            Play
          </button>
          <button
            onClick={showInstructions}
            className="px-4 py-2 bg-gray-700 rounded mb-2"
          >
            How to Play
          </button>
          <button
            onClick={showLeaderboard}
            className="px-4 py-2 bg-gray-700 rounded"
          >
            Leaderboard
          </button>
        </div>
      )}
      {gameState === "instructions" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white p-4">
          <h2 className="text-3xl mb-4">How to Play</h2>
          <p className="mb-2">
            Move the green square with arrow keys or touch. Collect coins that
            appear on the screen. When two coins of the same type touch the
            player, they merge into a higher‑value coin. The more you collect,
            the higher your score and the prize pool. Avoid letting too many
            coins pile up or the game will end.
          </p>
          <button
            onClick={() => setGameState("menu")}
            className="px-4 py-2 bg-gray-700 rounded"
          >
            Back
          </button>
        </div>
      )}
      {gameState === "leaderboard" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white p-4">
          <h2 className="text-3xl mb-4">Leaderboard</h2>
          <ol className="text-left">
            {leaderboard.map((entry, idx) => (
              <li key={idx} className="mb-1">
                {idx + 1}. {entry.name} – {entry.score} pts
              </li>
            ))}
          </ol>
          <button
            onClick={() => setGameState("menu")}
            className="px-4 py-2 bg-gray-700 rounded mt-4"
          >
            Back
          </button>
        </div>
      )}
      {gameState === "congrats" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white p-4">
          <h2 className="text-3xl mb-4">Congratulations!</h2>
          <p className="mb-2">You reached a high score of {score}.</p>
          <button
            onClick={() => setGameState("menu")}
            className="px-4 py-2 bg-gray-700 rounded"
          >
            Back to Menu
          </button>
        </div>
      )}
      {gameState === "gameover" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white">
          <h1 className="text-4xl mb-4">Game Over</h1>
          <p className="mb-2">Score: {score}</p>
          <p className="mb-2">Prize Pool: {prizePool}</p>
          <button
            onClick={startGame}
            className="px-4 py-2 bg-blue-500 rounded mb-2"
          >
            Replay
          </button>
          <button
            onClick={showLeaderboard}
            className="px-4 py-2 bg-gray-700 rounded"
          >
            Leaderboard
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
