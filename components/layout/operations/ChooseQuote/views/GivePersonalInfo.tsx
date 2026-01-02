import React, { useEffect, useState } from "react";
import I18n from "components/common/i18n";
import GreyStepBox from "components/common/GreyStepBox";
import StepTitle from "components/common/StepTitle";
import { capitalizeFirstChar, getStringDate } from "lib/commonFunctions";
import styled from "styled-components";
import useQuoteObtaining from "hooks/useQuoteObtaining";
import { AUTO, CAMIONETA, fuelTypeList, MOTO_CHICA, MOTO_GRANDE, getVehicleTypeDisplay } from 'lib/constants'

const RadioSection = styled.div`
  display: inline-block;
  margin-right: 20px;
  font-family: Nunito-SemiBold;
`;

const RadioSectionLabel = styled.label`
  margin-right: 4px;
  display: inline;
  font-family: Nunito-SemiBold;
`;

const InputSection = styled.div`
  margin-bottom: 10px;
  margin-left: 10px;
  :fist-of-type{
    margin:left: 0;
  }
  @media (max-width: 996px) {
    margin:left: 0;
  }
`;

const InputLabel = styled.div`
  font-family: Nunito-SemiBold;
  display: inline;
  margin-right: 10px;
  font-size: 15px;
`;

const DateSelected = styled.div`
  position: relative;
  font-size: 16px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.69;
  letter-spacing: -0.24px;
  color: #000000;
`;

const BtnContainer = styled.div`
  text-align: right;
  font-family: Nunito-SemiBold;
  margin-top: 22px;
  @media (max-width: 996px) {
    margin-top: 33px;
  }
`;

interface IBtnProps {
  plant: string;
}

const Btn = styled.button`
  padding: 15px 28px 14px 27px;
  border-radius: 2px;
  background-color: ${(props: IBtnProps) =>
    (props.plant==='rivadavia' || props.plant==='sanmartin' || props.plant==='godoycruz') ? "#052c33" : "rgb(116,172,223)"};
  font-size: 15px;
  font-weight: 600;
  font-stretch: normal;
  font-style: normal;
  line-height: normal;
  letter-spacing: -0.15px;
  text-align: center;
  color: #ffffff;
  @media (max-width: 996px) {
    width: 100%;
  }
  :disabled {
    background: grey;
  }
`;

const ChooseMessage = styled.div`
  position: relative;
  font-family: Nunito-SemiBold;
  font-size: 16px;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.88;
  letter-spacing: -0.29px;
  color: #000000;
`;

const ErrorMsg = styled.div`
  color: red;
  margin-top: 10px;
`;

interface TextInputProps {
  fullWidth?: boolean;
  width?: number;
  boxHeight?: number;
  marginTop?: number;
}

const TextInput = styled.input`
  width: ${(props: TextInputProps) =>
    props.fullWidth ? "100%" : props.width + "px"};
  font-size: 15px;
  height: ${(props: TextInputProps) =>
    props.boxHeight ? props.boxHeight + "px" : "40px"};
  border-radius: 2px;
  border: solid 1px #cccccc;
  background-color: #ffffff;
  padding-left: 8px;
  @media (max-width: 996px) {
    max-width: 250px;
  }
`;

const getGiveEmailStepNumber = (plant: string): number => {
  if (plant === "sanmartin") return 2;
  else return 3;
};

function GivePersonalInfo(): JSX.Element {
  const [
    { quotes, quoteSelected, nombre, anio, email, dominio, telefono, fuelType, vehicleType },
    {
      onModifyDateAddressChange,
      onSubmitPersonalInfo,
      onModifyVehicleType
    },
  ] = useQuoteObtaining();

  useEffect(()=>{
    onChangeEmail(email);
  }, [email])

  useEffect(()=>{
    onChangeDominio(dominio);
  }, [dominio])

  useEffect(()=>{
    onChangeTelefono(telefono);
  }, [telefono])

  useEffect(()=>{
    if(localFuelType === "") onChangeFuelType(fuelType);
  }, [fuelType])

  useEffect(()=>{
    onChangeNombre(nombre);
  }, [nombre])

  useEffect(()=>{
    onChangeAnio(anio);
  }, [anio])

  const [showErrors, setShowErrors] = useState(false);
  const [localNombre,setLocalNombre] = useState(nombre);
  const [validNombreFormat, setValidNombreFormat] = useState(false);
  const [nombreErrorMsg, setNombreErrorMsg] = useState('');
  const [localAnio,setLocalAnio] = useState(anio);
  const [validAnioFormat, setValidAnioFormat] = useState(false);
  const [anioErrorMsg, setAnioErrorMsg] = useState('');
  const [localEmail,setLocalEmail] = useState(email);
  const [validEmailFormat, setValidEmailFormat] = useState(false);
  const [emailErrorMsg, setEmailErrorMsg] = useState('');
  const [localDominio, setLocalDominio] = useState(dominio);
  const [dominioErrorMsg, setDominioErrorMsg] = useState('');
  const [validDominioFormat, setValidDominioFormat] = useState(false);
  const [localTelefono, setLocalTelefono] = useState(telefono);
  const [validTelefonoFormat, setValidTelefonoFormat] = useState(false);
  const [telefonoErrorMsg, setTelefonoErrorMsg] = useState('');
  const [localFuelType, setLocalFuelType] = useState('');
  const [validFuelTypeFormat, setValidFuelTypeFormat] = useState(false);
  const [fuelErrorMsg, setFuelErrorMsg] = useState('');

  const onChangeNombre = (nombre: string) => {
    if (
      /^[a-zA-Z\s]{3,100}$/.test(
        nombre
      )
    )
      {
        setValidNombreFormat(true);
        setNombreErrorMsg('');
      }
    else {
      setValidNombreFormat(false);
      setNombreErrorMsg('El formato del nombre ingresado no es valido')
    }
    setLocalNombre(nombre.toUpperCase());
  };

  const onChangeAnio = (anio: string) => {
    if (
      /^[0-9]{4}$/.test(
        anio
      )
    )
      {
        setValidAnioFormat(true);
        setAnioErrorMsg('');
      }
    else {
      setValidAnioFormat(false);
      setAnioErrorMsg('El formato del año ingresado no es valido')
    }
    setLocalAnio(anio);
  };

  const onChangeEmail = (email: string) => {
    if (
      /^[-\w.%+]{1,64}@(?:[a-zA-Z0-9-]{1,63}\.){1,125}[a-zA-Z]{2,63}$/.test(
        email
      )
    )
      {
        setValidEmailFormat(true);
        setEmailErrorMsg('');
      }
    else {
      setValidEmailFormat(false);
      setEmailErrorMsg('El formato del email ingresado no es valido')
    }
    setLocalEmail(email.toUpperCase());
  };

  const onChangeDominio = (dominio: string) => {
    const autoRegExp=/^([a-zA-Z]{3}[0-9]{3}|[a-zA-Z]{2}[0-9]{3}[a-zA-Z]{2})$/;
    const motoRegExp=/^([a-zA-Z]{1}[0-9]{3}[a-zA-Z]{3}|[0-9]{3}[a-zA-Z]{3})$/;
    const isValidAutoCamioneta = (vehicleType===AUTO || vehicleType===CAMIONETA) && autoRegExp.test(dominio);
    const isValidMoto = (vehicleType===MOTO_CHICA || vehicleType===MOTO_GRANDE) && motoRegExp.test(dominio);
    if (isValidAutoCamioneta || isValidMoto) {
      setValidDominioFormat(true);
      setDominioErrorMsg('')
    }
    else {
      setValidDominioFormat(false);
      setDominioErrorMsg('El formato del dominio ingresado no es valido')
    }
    setLocalDominio(dominio.toUpperCase());
  };

  const onChangeTelefono = (telefono: string) => {
    if (
      /^[0-9]{8,16}$/.test(
        telefono
      )
    )
      {
        setValidTelefonoFormat(true);
        setTelefonoErrorMsg('');
      }
    else {
      setValidTelefonoFormat(false);
      setTelefonoErrorMsg('El formato del telefono ingresado no es valido')
    }
    setLocalTelefono(telefono);
  };

  const onChangeFuelType = (fuelType: string) => {
    if (
      /^(NAFTA|DIESEL|GAS)$/.test(
        fuelType
      )
    )
    setValidFuelTypeFormat(true);
    else {
      setValidFuelTypeFormat(false);
      setFuelErrorMsg('Tipo de combustible no es valido')
    }
    setLocalFuelType(fuelType);
  };

  const handleSubmitPersonalInfo = () => {
    if(!validEmailFormat || !validDominioFormat || !validTelefonoFormat || !validFuelTypeFormat || !validAnioFormat || !validNombreFormat) setShowErrors(true);
    else onSubmitPersonalInfo(localNombre, localAnio, localEmail, localDominio, localTelefono, localFuelType);
  }

  return (
    <>

<StepTitle plant={quotes.plant} stepNumber={1} checked noMargin>
        <I18n id="app.quoteObtaining.schedule.calendar.step1.title" />
      </StepTitle>
      <GreyStepBox withModify={true} modifyFunction={onModifyVehicleType}>
        <DateSelected>
          <b>Tipo de vehiculo:</b>{" "}
          {getVehicleTypeDisplay(vehicleType, quotes.plant)}
        </DateSelected>
      </GreyStepBox>
      <StepTitle plant={quotes.plant} checked stepNumber={2}>
        <I18n id="app.quoteObtaining.schedule.calendar.step2.title" />
      </StepTitle>

      <GreyStepBox withModify={true} modifyFunction={onModifyDateAddressChange}>
        <DateSelected>
          <b>Fecha:</b>{" "}
          {capitalizeFirstChar(getStringDate(quoteSelected.fecha))}
          {"."}
          <br />
          <b>Hora:</b> {quoteSelected.hora.substr(0, 5)}
        </DateSelected>
      </GreyStepBox>

      <StepTitle
        plant={quotes.plant}
        stepNumber={getGiveEmailStepNumber(quotes.plant)}
      >
        <I18n id={`app.quoteObtaining.schedule.calendar.step${getGiveEmailStepNumber(quotes.plant)}.title`} />
      </StepTitle>

      <GreyStepBox>
        <>
          <ChooseMessage>
            <I18n id="app.quoteObtaining.schedule.calendar.emailConf.subtitle" />
          </ChooseMessage>
          <div style={{width: "100%", height: "25px"}}></div>
          <InputSection>
            <InputLabel>
              Nombre:
            </InputLabel>
            <TextInput
              value={localNombre}
              onChange={(e) => onChangeNombre(e.target.value)}
              width={250}
            ></TextInput>
            <ErrorMsg>{showErrors && nombreErrorMsg}</ErrorMsg>
          </InputSection>
          <InputSection>
            <InputLabel>
              Dominio (sin guiones):
            </InputLabel>
            <TextInput
              value={localDominio}
              onChange={(e) => onChangeDominio(e.target.value)}
              width={250}
            ></TextInput>
            <ErrorMsg>{showErrors && dominioErrorMsg}</ErrorMsg>
          </InputSection>
          <InputSection>
            <InputLabel>
              Año (Vehiculo):
            </InputLabel>
            <TextInput
              value={localAnio}
              onChange={(e) => onChangeAnio(e.target.value)}
              width={250}
            ></TextInput>
            <ErrorMsg>{showErrors && anioErrorMsg}</ErrorMsg>
          </InputSection>
          <InputSection>
          <InputLabel>
              Email:
            </InputLabel>
            <TextInput
              value={localEmail}
              onChange={(e) => onChangeEmail(e.target.value)}
              width={300}
            ></TextInput>
            <ErrorMsg>{showErrors && emailErrorMsg}</ErrorMsg>
          </InputSection>
          <InputSection>
          <InputLabel>
              Telefono:
            </InputLabel>
            <TextInput
            type="number"
              value={localTelefono}
              onChange={(e) => onChangeTelefono(e.target.value)}
              width={250}
            ></TextInput>
            <ErrorMsg>{showErrors && telefonoErrorMsg}</ErrorMsg>
          </InputSection>
          <br/>
          <InputSection>
          <InputLabel>
              Combustible:
            </InputLabel>
         {fuelTypeList.map((fuelT)=> {
           let checked=false;
           if(fuelT)
           return (
            <RadioSection>
              <RadioSectionLabel htmlFor={fuelT}>{fuelT}</RadioSectionLabel>
              <input onClick={() => onChangeFuelType(fuelT)} type="radio" id={fuelT} name="fuelType" value={fuelT} checked={fuelT===localFuelType} ></input>
            </RadioSection>
           )
         })}
            <ErrorMsg>{showErrors && fuelErrorMsg}</ErrorMsg>
          </InputSection>
          <BtnContainer>
            <Btn
              plant={quotes.plant}
              onClick={handleSubmitPersonalInfo}
            >
              <I18n id="app.quoteObtaining.schedule.calendar.continue" />
            </Btn>
          </BtnContainer>
        </>
      </GreyStepBox>
    </>
  );
}

export default GivePersonalInfo;
