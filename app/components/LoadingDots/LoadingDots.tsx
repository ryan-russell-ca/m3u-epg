import clsx from 'clsx';
import React from 'react';
import styles from './LoadingDots.module.css';

const LoadingDots = ({
  children,
  className,
}: React.PropsWithChildren<HTMLSpanElement>) => {
  return (
    <span className={clsx(styles.loading, className)}>
      {children && <div className={styles.child}>{children}</div>}
      <span />
      <span />
      <span />
    </span>
  );
};

export default LoadingDots;
