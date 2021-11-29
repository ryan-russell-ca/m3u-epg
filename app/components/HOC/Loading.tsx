import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import styles from './Loading.module.scss';

const withLoader = <P extends object>(Component: React.ComponentType<P>) => {
  const Fn: React.FunctionComponent<P & { isLoading: boolean }> = ({
    ...props
  }) => {
    const router = useRouter();

    const [isLoading, setLoading] = useState(false);

    const handleStart = () => setLoading(true);
    const handleComplete = () => setLoading(false);

    useEffect(() => {
      router.events.on('routeChangeStart', handleStart);
      router.events.on('routeChangeComplete', handleComplete);
      router.events.on('routeChangeError', handleComplete);

      return () => {
        router.events.off('routeChangeStart', handleStart);
        router.events.off('routeChangeComplete', handleComplete);
        router.events.off('routeChangeError', handleComplete);
      };
    });

    return (
      <>
        <Component
          {...props}
          onLoadingStart={handleStart}
          onLoadingComplete={handleComplete}
          isLoading={isLoading}
        />
        {isLoading && (
          <div className={styles['loading-container']}>
            <div className={styles['loading-container-loader']}>
              <div />
            </div>
          </div>
        )}
      </>
    );
  };

  Fn.displayName = 'withLoader';

  return Fn;
};

export default withLoader;
