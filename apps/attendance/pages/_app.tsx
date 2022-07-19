/* eslint-disable @next/next/no-sync-scripts */
import Head from 'next/head';
import type { AppProps } from 'next/app';
import '../styles/globals.css';
import '../styles/table.less';

function MyApp({ Component, pageProps, router }: AppProps) {
  const { query } = router;
  const showDebug = query.debug !== undefined;

  return (
    <>
      <Head>
        <title>考勤打卡</title>
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,user-scalable=0,viewport-fit=cover"
        />
        {showDebug && (
          <>
            <script src="https://unpkg.com/vconsole@latest/dist/vconsole.min.js" />
            <script>var vConsole = new window.VConsole();</script>
          </>
        )}
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
