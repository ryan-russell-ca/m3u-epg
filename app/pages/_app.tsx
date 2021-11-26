import '@/assets/base.scss';
import { Layout } from '@/components/Layout';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';

const App = ({ Component, pageProps }) => {
  return (
    <ThemeProvider>
      <Layout>
        <Component {...pageProps} />
        <Toaster />
      </Layout>
    </ThemeProvider>
  );
}

export default App;
