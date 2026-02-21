'use client';

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

export default function PlantPage({ params }: any) {
  const plantName = params.plantId;
  const validPlant = PLANTS.some((plant) => plant.id === plantName);

  return (
    <>
      {validPlant && HEADERS[plantName]}
      <QuoteObtainingProvider id={null} plant={plantName} operation={validPlant ? 'chooseQuote' : 'error'}>
        <Main />
      </QuoteObtainingProvider>
    </>
  );
}
