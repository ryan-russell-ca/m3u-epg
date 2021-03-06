import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import styles from './Loading.module.scss';

const withLoader = <P extends object>(
  Component: React.ComponentType<
    P & {
      onLoadingStart: () => void;
      onLoadingComplete: () => void;
    }
  >
) => {
  const Fn: React.FunctionComponent<P> = ({ ...props }) => {
    const router = useRouter();

    const [isLoading, setLoading] = useState(false);

    useEffect(() => {
      const handleStart = () => setLoading(true);
      const handleComplete = () => setLoading(false);

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
          onLoadingStart={() => setLoading(true)}
          onLoadingComplete={() => setLoading(false)}
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
