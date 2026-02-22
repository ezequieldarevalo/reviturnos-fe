'use client';

import { use } from 'react';
import HeaderGodoyCruz from 'components/layout/structure/HeaderGodoycruz';
import HeaderRevitotal from 'components/layout/structure/HeaderRevitotal';
import HeaderRivadavia from 'components/layout/structure/HeaderRivadavia';
import HeaderSanmartin from 'components/layout/structure/HeaderSanmartin';
import Main from 'components/Main';
import QuoteObtainingProvider from 'contexts/QuoteObtaining';
import { PLANTS } from 'lib/constants';

const HEADERS: Record<string, JSX.Element> = {
  lasheras: <HeaderRevitotal />,
  maipu: <HeaderRevitotal />,
  rivadavia: <HeaderRivadavia />,
  godoycruz: <HeaderGodoyCruz />,
  sanmartin: <HeaderSanmartin />,
};

export default function ChangeDatePage({
  params,
}: any) {
  const resolvedParams = use(params) as { plantId: string; id: string };
  const plantName = resolvedParams.plantId;
  const quoteId = resolvedParams.id;
  const validPlant = PLANTS.some((plant) => plant.id === plantName);

  return (
    <>
      {validPlant && HEADERS[plantName]}
      <QuoteObtainingProvider id={quoteId} plant={plantName} operation={validPlant ? 'changeDate' : 'error'}>
        <Main />
      </QuoteObtainingProvider>
    </>
  );
}
