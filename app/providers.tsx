'use client';

import { ReactNode } from 'react';
import { I18nProvider } from 'contexts/I18n';
import { GlobalStyle } from 'themes/defaultTheme';
import initialMessages from '../public/messages/es-AR.json';

interface Props {
  children: ReactNode;
}

export default function Providers({ children }: Props) {
  return (
    <I18nProvider lang="es-AR" messages={initialMessages}>
      {children}
      <GlobalStyle />
    </I18nProvider>
  );
}
