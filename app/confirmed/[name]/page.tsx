'use client';

import Message from 'components/layout/Message';
import HeaderGodoyCruz from 'components/layout/structure/HeaderGodoycruz';
import HeaderRevitotal from 'components/layout/structure/HeaderRevitotal';
import HeaderRivadavia from 'components/layout/structure/HeaderRivadavia';
import ViewWrapper from 'components/layout/structure/ViewWrapper';
import I18n from 'components/common/i18n';
import { MessageTitle } from 'components/common/styles/UtilsStyles';

const renderHeader = (plantName: string) => {
  if (plantName === 'rivadavia') return <HeaderRivadavia />;
  if (plantName === 'godoycruz') return <HeaderGodoyCruz />;
  return <HeaderRevitotal />;
};

export default function ConfirmedPage({ params }: any) {
  const name = params.name;

  if (name !== 'maipu' && name !== 'lasheras' && name !== 'rivadavia' && name !== 'godoycruz') {
    return (
      <ViewWrapper>
        <Message type="ERROR">
          <MessageTitle type="ERROR">
            <I18n id="app.quoteObtaining.error.notFound.title" />
          </MessageTitle>
          <br />
        </Message>
      </ViewWrapper>
    );
  }

  return (
    <>
      {renderHeader(name)}
      <ViewWrapper name={name}>
        <Message type="SUCCESS">
          <MessageTitle type="SUCCESS">
            <I18n id="app.quoteObtaining.error.confirmedQuote.title" />
          </MessageTitle>
          <p>
            <I18n id="app.quoteObtaining.error.confirmedQuote.message" />
          </p>
          <p>
            <I18n id="app.quoteObtaining.error.confirmedQuote.thanks" />
          </p>
          <br />
        </Message>
      </ViewWrapper>
    </>
  );
}
