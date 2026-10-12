import styles from './OptionGlyph.module.css';

type OptionGlyphProps = {
  emoji?: string;
  label: string;
  className?: string;
};

function getMonogram(label: string): string {
  const firstCharacter = [...label.normalize('NFC').trim()][0];
  return firstCharacter?.toLocaleUpperCase('vi') ?? '';
}

export default function OptionGlyph({ emoji, label, className }: OptionGlyphProps) {
  const classes = [styles.glyph, className].filter(Boolean).join(' ');

  return (
    <span aria-hidden="true" className={classes}>
      {emoji ?? <span className={styles.monogram}>{getMonogram(label)}</span>}
    </span>
  );
}
