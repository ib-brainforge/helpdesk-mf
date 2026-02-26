import { Html, Head, Body, Scripts } from '@modern-js/runtime/document';

const APP_TITLE = process.env.APP_TITLE || 'Loading...';
const BASE_PATH = process.env.BASE_PATH || '';
const withBasePath = (path: string) => {
  let effectiveBasePath = BASE_PATH;
  if (effectiveBasePath && !effectiveBasePath.endsWith('/')) {
    effectiveBasePath += '/';
  }
  return `${effectiveBasePath}${path}`;
};

export default function Document() {
  return (
    <Html lang="en" data-app-loading="true">
      <Head>
        <title>{APP_TITLE}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" type="image/png" href={withBasePath('favicon-96x96.png')} sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href={withBasePath('favicon.svg')} />
        <link rel="shortcut icon" href={withBasePath('favicon.ico')} />
        <link rel="apple-touch-icon" sizes="180x180" href={withBasePath('apple-touch-icon.png')} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
                            (function () {
                              try {
                                var key = 'heroui-theme';
                                var stored = localStorage.getItem(key);
                                if (!stored) return;
                                var html = document.documentElement;
                                html.classList.remove('light', 'dark', 'system');
                                if (stored === 'system') {
                                  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                                  html.classList.add(prefersDark ? 'dark' : 'light');
                                } else {
                                  html.classList.add(stored);
                                }
                              } catch (err) {
                                // ignore
                              }
                            })();
                        `,
          }}
        />
      </Head>
      <Body>
        <div id="root" />
        <Scripts />
      </Body>
    </Html>
  );
}
