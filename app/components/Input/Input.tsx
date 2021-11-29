import clsx from 'clsx';
import { forwardRef, ForwardRefRenderFunction } from 'react';
import styles from './Input.module.scss';

type InputType = {
  label: string;
  htmlType: string;
  autoComplete?: string;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  size?: string;
  required?: boolean;
};

const InputRenderer: ForwardRefRenderFunction<HTMLInputElement, InputType> = (
  {
    label,
    placeholder,
    className,
    htmlType,
    autoComplete,
    size,
    ariaLabel,
    required,
  },
  ref
) => {
  return (
    <div className={clsx(styles.root, className)}>
      <label>
        {label && <div className={styles.label}>{label}</div>}
        <input
          type={htmlType}
          autoComplete={autoComplete}
          placeholder={placeholder}
          ref={ref}
          className={clsx(styles.input, size && styles[size])}
          aria-label={ariaLabel}
          required={required}
        />
      </label>
    </div>
  );
};

const Input = forwardRef<HTMLInputElement, InputType>(InputRenderer);

export default Input;
