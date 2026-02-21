import React, { createContext } from 'react';

export interface IMessages {
  [key: string]: string;
}

export interface II18nContextValue {
  lang: string;
  messages: IMessages;
}

const I18nContext = createContext<II18nContextValue>({
  lang: 'es-AR',
  messages: {},
});

export function I18nProvider({
  lang,
  messages,
  children,
}: React.PropsWithChildren<II18nContextValue>): JSX.Element {
  return (
    <I18nContext.Provider value={{ lang, messages }}>
      {children}
    </I18nContext.Provider>
  );
}

export default I18nContext;
