import '@/assets/base.scss';
import { Layout } from '@/components/Layout';
import { ThemeProvider } from 'next-themes';
import React from 'react';
import { Toaster } from 'react-hot-toast';

const App = ({
  Component,
  pageProps,
}: {
  Component: React.ComponentType;
  pageProps: React.PropsWithChildren<HTMLElement>;
}) => {
  return (
    <ThemeProvider>
      <Layout>
        <Component {...pageProps} />
        <Toaster />
      </Layout>
    </ThemeProvider>
  );
};

export default App;
