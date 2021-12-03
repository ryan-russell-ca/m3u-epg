import clsx from 'clsx';
import { forwardRef, ForwardRefRenderFunction } from 'react';
import styles from './Input.module.scss';

type InputType = {
  htmlType: string;
  autoComplete?: string;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  size?: string;
  required?: boolean;
  defaultValue?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const InputRenderer: ForwardRefRenderFunction<HTMLInputElement, InputType> = (
  {
    placeholder,
    className,
    htmlType,
    autoComplete,
    size,
    ariaLabel,
    required,
    defaultValue,
    onChange,
  },
  ref
) => {
  return (
    <div className={clsx(styles['input-container'], className)}>
      <input
        type={htmlType}
        autoComplete={autoComplete}
        placeholder={placeholder}
        ref={ref}
        className={clsx(styles.input, size && styles[size])}
        aria-label={ariaLabel}
        required={required}
        onChange={onChange}
        defaultValue={defaultValue}
      />
    </div>
  );
};

const Input = forwardRef<HTMLInputElement, InputType>(InputRenderer);

export default Input;
