import '../styles/globals.css';
import type { ReactNode } from 'react';
import Providers from './providers';

export const metadata = {
  title: 'Turnero',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        <link
          href="https://fonts.googleapis.com/css?family=Work+Sans:300,400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
