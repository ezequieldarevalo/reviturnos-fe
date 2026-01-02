import HeaderRevitotal from "components/layout/structure/HeaderRevitotal";

export const AUTO='AUTO PARTICULAR';
export const MOTO_CHICA='MOTO HASTA 300 CC';
export const MOTO_GRANDE='MOTO MAS DE 300 CC';
export const CAMIONETA='CAMIONETA PARTICULAR';

// Nombres para visualización en plantas lasheras y maipu
export const AUTO_LASHERAS_MAIPU_DISPLAY='AUTOMOVIL';
export const CAMIONETA_LASHERAS_MAIPU_DISPLAY='CAMIONETA/SUV/UTILITARIO';

export const vehicleTypeList = [
    AUTO,
    MOTO_CHICA,
    MOTO_GRANDE,
    CAMIONETA
];

// Función para obtener el nombre visual según la planta
export const getVehicleTypeDisplay = (vehicleType: string, plant: string): string => {
    if (plant === 'lasheras' || plant === 'maipu') {
        if (vehicleType === AUTO) return AUTO_LASHERAS_MAIPU_DISPLAY;
        if (vehicleType === CAMIONETA) return CAMIONETA_LASHERAS_MAIPU_DISPLAY;
    }
    return vehicleType;
};

// Función para obtener el nombre real desde el nombre visual
export const getVehicleTypeFromDisplay = (displayName: string, plant: string): string => {
    if (plant === 'lasheras' || plant === 'maipu') {
        if (displayName === AUTO_LASHERAS_MAIPU_DISPLAY) return AUTO;
        if (displayName === CAMIONETA_LASHERAS_MAIPU_DISPLAY) return CAMIONETA;
    }
    return displayName;
};



export const fuelTypeList = [
    'NAFTA',
    'DIESEL',
    'GAS',
];

export const PLANTS=[
    {id: 'lasheras', available: true},
    {id: 'maipu', available: true},
    // {id: 'rivadavia', available: true},
    {id: 'godoycruz', available: true},
    // {id: 'sanmartin', available: true},
];