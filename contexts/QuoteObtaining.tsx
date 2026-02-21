import React, {
  useCallback,
  useState,
  useMemo,
  createContext,
  useEffect,
} from "react";
import type { ReactNode } from "react";
import styled from "styled-components";
import LoaderG from "../components/common/LoaderG";
import { fuelTypeList } from 'lib/constants'

const LoadingContainer = styled.div`
  min-height: 290px;
`;

export interface IQuote {
  id: string;
  fecha: string;
  hora: string;
}

export interface IQuoteObtaining {
  plant: string;
  tipo_vehiculo: string;
  precio: number;
  dias: string[];
  turnos: IQuote[];
  fecha?: string;
  hora?: string;
}

export interface ICancelQuoteObtaining {
  plant: string;
  quote: IQuote;
}

export interface ICancelQuoteObtaining {
  quote: IQuote
}

export interface IQuoteObtainingResponse {
  quotes: IQuoteObtaining
}


export interface ICancelQuoteObtainingResponse {
  quotes: ICancelQuoteObtaining
}

export interface IQuoteObtainingError {
  saleChannel?: string;
  status?: string;
  reason: string;
}

type ApiLikeError = {
  graphQLErrors: Array<{
    extensions: {
      details: IQuoteObtainingError;
    };
  }>;
};

export interface FetchResult<T> {
  data?: T;
}

interface QuoteObtainingProviderProps {
  id: string | null;
  children: ReactNode;
  plant: string;
  operation: string;
}

export interface IRescheduleResponseReschedule {
  url_pago: string;
}

export interface IDateChangeResponseReschedule {
  done: boolean;
}

export interface ICancelQuoteResponseReschedule {
  done: boolean;
}

interface IRescheduleResponse {
  Reschedule: IRescheduleResponseReschedule;
}

export interface ISchedulingError {
  saleChannel?: string;
  reason: string;
  date?: string;
  shift?: string;
  canRetry?: boolean;
}

export const emptySchedulingError: ISchedulingError = {
  reason: "default",
};

const emptyQuoteSelected = { id: "", fecha: "", hora: "" };

export type QuoteObtainingContextValue = [
  {
    error: ApiLikeError | null;
    quotes: IQuoteObtaining;
    cancellingQuote: ICancelQuoteObtaining;
    plant: string;
    operation: string;
    vehicleType: string;
    vehicleTypeSelected: boolean;
    quoteSelected: IQuote;
    dateSelected: boolean;
    paymentPlatform: string;
    paymentPlatformSelected: boolean;
    nombre: string;
    anio: string;
    email: string;
    dominio: string;
    telefono: string;
    fuelType: string;
    emailEntered: boolean;
    personalInfoEntered: boolean;
    loading: boolean;
    showError: boolean;
    changeDateDone: boolean;
    chooseQuoteDone: boolean;
    cancelQuoteDone: boolean;
  },
  {
    onSelectVehicleType: (type:string) => void;
    onModifyVehicleType: () => void;
    onSelectDate: (id: string, fecha: string, hora: string) => void;
    onModifyDateAddressChange: () => void;
    resetShift: () => void;
    onChangePaymentPlatform: (paymentPlatform: string) => void;
    onSubmitPaymentPlatform: () => void;
    onModifyPaymentPlatform: () => void;
    onModifyEmail: () => void;
    onModifyPersonalInfo: () => void;
    onSubmitEmail: (email:string) => void;
    onSubmitPersonalInfo: (nombre: string, anio: string, email:string, dominio:string, telefono:string, fuelType:string) => void;
    onSubmit: () => Promise<FetchResult<IRescheduleResponse>>;
  }
];

export const QuoteObtainingContext = createContext<QuoteObtainingContextValue>([
  {
    error: null,
    quotes: null,
    cancellingQuote: null,
    plant: null,
    operation: null,
    vehicleType: null,
    vehicleTypeSelected: null,
    quoteSelected: null,
    dateSelected: null,
    paymentPlatform: null,
    paymentPlatformSelected: null,
    nombre: null,
    anio: null,
    email: null,
    dominio: null,
    telefono: null,
    fuelType: null,
    emailEntered: null,
    personalInfoEntered: null,
    loading: null,
    showError: null,
    changeDateDone: null,
    chooseQuoteDone: null,
    cancelQuoteDone: null,
  },
  {
    onSelectVehicleType: (type: string) => null,
    onModifyVehicleType: () => null,
    onSelectDate: (id: string, fecha: string, hora: string) => null,
    onModifyDateAddressChange: () => null,
    resetShift: () => null,
    onChangePaymentPlatform: () => null,
    onSubmitPaymentPlatform: () => null,
    onModifyPaymentPlatform: () => null,
    onModifyEmail: () => null,
    onModifyPersonalInfo: () => null,
    onSubmitEmail: () => null,
    onSubmitPersonalInfo: () => null,
    onSubmit: () => Promise.reject(),
  },
]);

export const emptyQuoteObtainingError = {
  reason: "default",
};

export default function QuoteObtainingProvider({
  id,
  plant,
  operation,
  children,
}: QuoteObtainingProviderProps): JSX.Element {
  const [quoteSelected, setQuoteSelected] =
    useState<IQuote>(emptyQuoteSelected);

  const [vehicleType, setVehicleType] = useState<string>('AUTO PARTICULAR');

  const [vehicleTypeSelected, setVehicleTypeSelected] = useState<boolean>(false);

  const [dateSelected, setDateSelected] = useState<boolean>(false);

  const [paymentPlatform, setPaymentPlatform] = useState<string>("mercadoPago");

  const [paymentPlatformSelected, setPaymentPlatformSelected] =
    useState<boolean>(false);

  const [nombre, setNombre] = useState<string>("");

  const [anio, setAnio] = useState<string>("");

  const [email, setEmail] = useState<string>("");

  const [dominio, setDominio] = useState<string>("");

  const [telefono, setTelefono] = useState<string>("");

  const [fuelType, setFuelType] = useState<string>(fuelTypeList[0]);

  const [emailEntered, setEmailEntered] = useState<boolean>(false);

  const [personalInfoEntered, setPersonalInfoEntered] = useState<boolean>(false);

  const [showError, setShowError] = useState<boolean>(false);

  const [chooseQuoteDone, setChooseQuoteDone] = useState<boolean>(false);

  const [changeDateDone, setChangeDateDone] = useState<boolean>(false);

  const [cancelQuoteDone, setCancelQuoteDone] = useState<boolean>(false);

  const [error, setError] = useState<ApiLikeError | null>(null);
  const [quotes, setQuotes] = useState<IQuoteObtaining | null>(null);
  const [cancellingQuote, setCancellingQuote] = useState<ICancelQuoteObtaining | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const buildError = (reason: string, status?: string): ApiLikeError => ({
    graphQLErrors: [
      {
        extensions: {
          details: {
            reason,
            status,
          },
        },
      },
    ],
  });

  const postToBackend = async <T,>(plantCode: string, path: string, body: any): Promise<T> => {
    const response = await fetch(`/api/backend/${path}?plant=${plantCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });

    let payload: any = {};
    try {
      payload = await response.json();
    } catch (_e) {
      payload = {};
    }

    if (!response.ok) {
      const reason = payload?.reason ||
        (response.status === 400
          ? 'BAD_REQUEST'
          : response.status === 500
            ? 'INTERNAL_ERROR_SERVER'
            : 'UNKNOWN_ERROR');
      throw buildError(reason, String(response.status));
    }

    return payload as T;
  };

  const onSelectVehicleType = useCallback(async (type: string): Promise<FetchResult<IQuoteObtainingResponse>> => {
    setVehicleType(type);
    setVehicleTypeSelected(true);
    setLoading(true);
    setError(null);
    try {
      const data = await postToBackend<IQuoteObtaining>(plant, 'api/auth/getQuotes', {
        tipoVehiculo: type,
      });
      setQuotes({ ...data, plant });
      return { data: { quotes: { ...data, plant } } };
    } catch (e: any) {
      setVehicleTypeSelected(false);
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [plant]);

  const onSelectDate = (id: string, fecha: string, hora: string): void => {
    setQuoteSelected({ id, fecha, hora });
    setDateSelected(true);
  };

  const onModifyVehicleType = () => {
    setVehicleTypeSelected(false);
    setDateSelected(false);
    setShowError(false);
  };

  const onModifyDateAddressChange = () => {
    setDateSelected(false);
    setShowError(false);
  };

  const resetShift = () => {
    setQuoteSelected({ ...quoteSelected, hora: null });
  };

  const onChangePaymentPlatform = (paymentPlatform: string) => {
    setPaymentPlatform(paymentPlatform);
  };

  const onSubmitPaymentPlatform = () => {
    setPaymentPlatformSelected(true);
  };

  const onModifyPaymentPlatform = () => {
    setPaymentPlatformSelected(false);
    setShowError(false);
  };

  const onModifyEmail = () => {
    setEmailEntered(false);
    setShowError(false);
  };

  const onModifyPersonalInfo = () => {
    setPersonalInfoEntered(false);
    setShowError(false);
  };

  const onSubmitPersonalInfo = (nombre: string, anio: string, email: string, dominio:string, telefono: string, fuelType:string) => {
    setNombre(nombre);
    setAnio(anio);
    setEmail(email);
    setDominio(dominio);
    setTelefono(telefono);
    setFuelType(fuelType);
    setPersonalInfoEntered(true);
  };

  const onSubmitEmail = (email: string) => {
    setEmail(email);
    setEmailEntered(true);
  };

  useEffect(() => {
    const loadInitial = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        if (operation === 'changeDate') {
          const data = await postToBackend<IQuoteObtaining>(plant, 'api/auth/getQuotesForResc', {
            id_turno: id,
          });
          setQuotes({ ...data, plant });
          setVehicleType(data.tipo_vehiculo);
        }
        if (operation === 'cancelQuote') {
          const data = await postToBackend<ICancelQuoteObtaining>(plant, 'api/auth/getQuoteForCancel', {
            id_turno: id,
          });
          setCancellingQuote({ ...data, plant });
        }
      } catch (e: any) {
        setError(e);
      } finally {
        setLoading(false);
      }
    };

    loadInitial();
  }, [id, operation, plant]);


  const onSubmit = useCallback(async (): Promise<FetchResult<IRescheduleResponse>> => {
    setLoading(true);
    setError(null);
    setShowError(false);
    try {
      if (operation === 'cancelQuote') {
        await postToBackend<ICancelQuoteResponseReschedule>(plant, 'api/auth/cancelQuote', {
          email,
          id_turno: id,
        });
        setCancelQuoteDone(true);
        return { data: { Reschedule: { url_pago: '' } } };
      }

      if (operation === 'chooseQuote') {
        const data = await postToBackend<IRescheduleResponseReschedule>(plant, 'api/auth/confQuote', {
          origen: 'T',
          email,
          dominio,
          nombre,
          telefono,
          anio,
          combustible: fuelType,
          id_turno: quoteSelected.id,
          tipo_vehiculo: quotes?.tipo_vehiculo,
          plataforma_pago: paymentPlatform || '',
        });

        if (plant === 'sanmartin') {
          setChooseQuoteDone(true);
        } else if (data?.url_pago) {
          window.location.href = data.url_pago;
        }

        return { data: { Reschedule: data } };
      }

      await postToBackend<IDateChangeResponseReschedule>(plant, 'api/auth/changeDate', {
        email,
        id_turno_nuevo: quoteSelected.id,
        id_turno_ant: id,
      });

      setChangeDateDone(true);
      return { data: { Reschedule: { url_pago: '' } } };
    } catch (e: any) {
      setShowError(true);
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [operation, plant, email, id, dominio, nombre, telefono, anio, fuelType, quoteSelected.id, quotes, paymentPlatform]);

  const value: QuoteObtainingContextValue = useMemo(
    () => [
      {
        error,
        quotes: quotes,
        cancellingQuote: cancellingQuote,
        plant,
        operation,
        vehicleType,
        vehicleTypeSelected,
        quoteSelected,
        dateSelected,
        paymentPlatform,
        paymentPlatformSelected,
        nombre,
        anio,
        email,
        dominio,
        telefono,
        fuelType,
        emailEntered,
        personalInfoEntered,
        loading,
        showError,
        changeDateDone,
        chooseQuoteDone,
        cancelQuoteDone,
      },
      {
        onSelectVehicleType,
        onModifyVehicleType,
        onSelectDate,
        onModifyDateAddressChange,
        resetShift,
        onChangePaymentPlatform,
        onSubmitPaymentPlatform,
        onModifyPaymentPlatform,
        onModifyEmail,
        onModifyPersonalInfo,
        onSubmitEmail,
        onSubmitPersonalInfo,
        onSubmit,
      },
    ],
    [
      error,
      quotes,
      cancellingQuote,
      plant,
      quoteSelected,
      vehicleType,
      vehicleTypeSelected,
      dateSelected,
      paymentPlatform,
      paymentPlatformSelected,
      nombre,
      anio,
      email,
      dominio,
      telefono,
      fuelType,
      emailEntered,
      personalInfoEntered,
      loading,
      showError,
      changeDateDone,
      chooseQuoteDone,
      cancelQuoteDone,
      onSelectVehicleType,
      onModifyVehicleType,
      onSelectDate,
      onModifyDateAddressChange,
      resetShift,
      onChangePaymentPlatform,
      onSubmitPaymentPlatform,
      onModifyPaymentPlatform,
      onSubmitEmail,
      onModifyEmail,
      onModifyPersonalInfo,
      onSubmitPersonalInfo,
      onSubmit,
    ]
  );

  if (loading) {
    return (
      <LoaderG loading noBackground>
        <LoadingContainer />
      </LoaderG>
    );
  }

  return (
    <QuoteObtainingContext.Provider value={value}>
      {children}
    </QuoteObtainingContext.Provider>
  );
}
