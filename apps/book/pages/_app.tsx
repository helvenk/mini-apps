import { AppProps } from 'next/app';
import Head from 'next/head';
import './styles.less';

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>最新全本</title>
      </Head>
      <main className="app">
        <Component {...pageProps} />
      </main>
    </>
  );
}

export default CustomApp;
