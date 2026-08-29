import { useEffect, useRef, useState } from 'react';
import diceRollSound from '../../assets/audio/dice-roll.wav';

interface DiceDockProps {
  canRoll: boolean;
  lastRoll: number[] | null;
  onRoll: () => void;
  rollLabel: string;
}

const randomDie = () => Math.floor(Math.random() * 6) + 1;

function Die({ value, rolling }: { value: number; rolling: boolean }) {
  return (
    <div
      className={`die-face face-${value} ${rolling ? 'is-rolling' : ''}`}
      aria-label={`${value}`}
    >
      {Array.from({ length: value }, (_, index) => (
        <span className={`pip pip-${index + 1}`} key={index} />
      ))}
    </div>
  );
}

export function DiceDock({ canRoll, lastRoll, onRoll, rollLabel }: DiceDockProps) {
  const [rolling, setRolling] = useState(false);
  const [displayValues, setDisplayValues] = useState<[number, number]>([1, 1]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const shuffleRef = useRef<number | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(diceRollSound);
    audioRef.current.volume = 0.42;

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (shuffleRef.current !== null) window.clearInterval(shuffleRef.current);
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!rolling && lastRoll?.length === 2) {
      setDisplayValues([lastRoll[0], lastRoll[1]]);
    }
  }, [lastRoll, rolling]);

  const handleRoll = () => {
    if (!canRoll || rolling) return;

    setRolling(true);
    setDisplayValues([randomDie(), randomDie()]);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      void audio.play().catch(() => undefined);
    }

    shuffleRef.current = window.setInterval(() => {
      setDisplayValues([randomDie(), randomDie()]);
    }, 80);

    timerRef.current = window.setTimeout(() => {
      if (shuffleRef.current !== null) window.clearInterval(shuffleRef.current);
      shuffleRef.current = null;
      onRoll();
      setRolling(false);
      timerRef.current = null;
    }, 520);
  };

  return (
    <section className="dice-dock" aria-label="Dice roller">
      <div className="dice-pair" aria-live="polite">
        <Die rolling={rolling} value={displayValues[0]} />
        <Die rolling={rolling} value={displayValues[1]} />
      </div>
      <button
        className="dice-roll-button"
        disabled={!canRoll || rolling}
        onClick={handleRoll}
        type="button"
      >
        {rolling ? 'Rolling…' : rollLabel}
      </button>
    </section>
  );
}
