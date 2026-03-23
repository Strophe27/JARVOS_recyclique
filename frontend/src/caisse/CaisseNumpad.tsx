/**
 * Pavé numérique caisse — parité visuelle 1.4.4 (recyclique Sale.tsx + components/ui/Numpad).
 */
import styles from './CaisseNumpad.module.css';

export interface CaisseNumpadProps {
  value: string;
  error?: string;
  onDigit: (digit: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  onDecimal?: () => void;
  unit?: string;
  showDecimal?: boolean;
  placeholder?: string;
}

export function CaisseNumpad({
  value,
  error,
  onDigit,
  onClear,
  onBackspace,
  onDecimal,
  unit = '',
  showDecimal = true,
  placeholder = '0',
}: CaisseNumpadProps) {
  const displayValue = value || placeholder;

  return (
    <div className={styles.root} data-testid="caisse-numpad">
      <div className={styles.displayWrap}>
        <div className={styles.displayActions}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Effacer un caractere"
            data-testid="numpad-backspace-top"
            onClick={onBackspace}
          >
            ⌫
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Effacer tout"
            data-testid="numpad-clear-top"
            onClick={onClear}
          >
            C
          </button>
        </div>
        <div
          className={`${styles.displayValue} ${error ? styles.displayError : ''}`}
          data-testid="numpad-display"
        >
          {displayValue}
          {unit ? ` ${unit}` : ''}
        </div>
        {error ? (
          <div className={styles.errorMsg} data-testid="numpad-error">
            {error}
          </div>
        ) : null}
      </div>

      <div className={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <button
            key={digit}
            type="button"
            className={styles.key}
            data-testid={`numpad-${digit}`}
            onClick={() => onDigit(String(digit))}
          >
            {digit}
          </button>
        ))}
        <div />
        <button type="button" className={styles.key} data-testid="numpad-0" onClick={() => onDigit('0')}>
          0
        </button>
        <button
          type="button"
          className={styles.key}
          data-testid="numpad-decimal"
          disabled={!onDecimal}
          onClick={() => onDecimal?.()}
        >
          .
        </button>
      </div>
    </div>
  );
}
