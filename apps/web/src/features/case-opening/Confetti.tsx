import styles from './Confetti.module.css';

type ConfettiColor = 'primary' | 'secondary' | 'accent';

type ConfettiPiece = {
  color: ConfettiColor;
  dot: boolean;
};

const CONFETTI_COLORS: readonly ConfettiColor[] = ['primary', 'secondary', 'accent'];

const CONFETTI_PIECES: readonly ConfettiPiece[] = Array.from(
  { length: 20 },
  (_, index): ConfettiPiece => {
    const colorIndex = Math.floor(index / 2) % CONFETTI_COLORS.length;

    return {
      color: CONFETTI_COLORS[colorIndex] ?? 'primary',
      dot: index % 4 === 0,
    };
  },
);

export default function Confetti() {
  return (
    <div aria-hidden="true" className={styles.layer}>
      {CONFETTI_PIECES.map((piece, index) => {
        return (
          <span
            className={[
              styles.piece,
              styles[`piece${index}`],
              styles[piece.color],
              piece.dot && styles.dot,
            ]
              .filter(Boolean)
              .join(' ')}
            key={index}
          />
        );
      })}
    </div>
  );
}
