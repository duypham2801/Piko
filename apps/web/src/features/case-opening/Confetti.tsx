import type { CSSProperties } from 'react';

import styles from './Confetti.module.css';

type ConfettiColor = 'primary' | 'secondary' | 'accent';

type ConfettiPiece = {
  x: number;
  y: number;
  rotate: number;
  color: ConfettiColor;
  dot: boolean;
};

const CONFETTI_COLORS: readonly ConfettiColor[] = ['primary', 'secondary', 'accent'];

const CONFETTI_PIECES: readonly ConfettiPiece[] = Array.from(
  { length: 20 },
  (_, index): ConfettiPiece => {
    const angle = (index * 18 * Math.PI) / 180;
    const reach = 1.25 + (index % 3) * 0.5;
    const rotation = 180 + index * 15;
    const colorIndex = Math.floor(index / 2) % CONFETTI_COLORS.length;

    return {
      x: Math.cos(angle) * reach,
      y: Math.sin(angle) * reach,
      rotate: index % 2 === 0 ? rotation : -rotation,
      color: CONFETTI_COLORS[colorIndex] ?? 'primary',
      dot: index % 4 === 0,
    };
  },
);

export default function Confetti() {
  return (
    <div aria-hidden="true" className={styles.layer}>
      {CONFETTI_PIECES.map((piece, index) => {
        const style = {
          '--confetti-x': piece.x,
          '--confetti-y': piece.y,
          '--confetti-rotate': piece.rotate,
        } as CSSProperties;

        return (
          <span
            className={[styles.piece, styles[piece.color], piece.dot && styles.dot]
              .filter(Boolean)
              .join(' ')}
            key={index}
            style={style}
          />
        );
      })}
    </div>
  );
}
