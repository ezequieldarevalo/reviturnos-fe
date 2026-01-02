import React from "react";
import I18n from "components/common/i18n";
import GreyStepBox from "components/common/GreyStepBox";
import StepTitle from "components/common/StepTitle";
import { capitalizeFirstChar, getStringDate } from "lib/commonFunctions";
import styled from "styled-components";
import useQuoteObtaining from "hooks/useQuoteObtaining";
import Image from "next/image";
import LoaderG from "components/common/LoaderG";
import Message from "components/layout/Message";
import ErrorMessage from "components/common/error/ErrorMessage";
import { Btn } from "components/common/styles/UtilsStyles";
import { getVehicleTypeDisplay } from "lib/constants";

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

const ImgContainer = styled.div`
  margin: 0 auto;
  border-radius: 8px;
`;

const BtnContainer = styled.div`
  text-align: right;
  font-family: Nunito-SemiBold;
  margin-top: 22px;
  margin-bottom: 15px;
  @media (max-width: 996px) {
    margin-top: 33px;
    margin-bottom: 0;
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
`;

const getImageByPlatform = (platform: string) => {
  if (platform === "yacare") return "/img/yacare.png";
  else return "/img/meli.png";
};

function Summary(): JSX.Element {
  const [
    {
      error,
      quotes,
      vehicleType,
      quoteSelected,
      paymentPlatform,
      nombre,
      email,
      dominio,
      anio,
      telefono,
      fuelType,
      loading,
      showError,
    },
    {
      onModifyVehicleType,
      onModifyDateAddressChange,
      onModifyPaymentPlatform,
      onModifyPersonalInfo,
      onSubmit,
    },
  ] = useQuoteObtaining();

  return (
    <LoaderG loading={loading} noBackground>

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

      <StepTitle plant={quotes.plant} checked stepNumber={3}>
        <I18n id="app.quoteObtaining.schedule.calendar.step3.title" />
      </StepTitle>

      <GreyStepBox withModify={true} modifyFunction={onModifyPersonalInfo}>
        <DateSelected>
        <b>Nombre:</b> {nombre}<br />
          <b>Email:</b> {email}<br />
          <b>Dominio:</b> {dominio}<br/>
          <b>Año:</b> {anio}<br/>
          <b>Telefono:</b> {telefono}<br/>
          <b>Combustible:</b> {fuelType}
        </DateSelected>
      </GreyStepBox>

      {quotes.plant !== "sanmartin" && (
        <>
          <StepTitle plant={quotes.plant} checked stepNumber={4}>
            <I18n id="app.quoteObtaining.schedule.calendar.step4.title" />
          </StepTitle>

          <GreyStepBox
            withModify={quotes.plant!=='godoycruz' && quotes.plant!=='rivadavia'}
            modifyFunction={onModifyPaymentPlatform}
          >
            <ImgContainer>
              <Image
                className="platform"
                src={getImageByPlatform(paymentPlatform)}
                alt="pepe"
                width="200"
                height="65"
              />
            </ImgContainer>
          </GreyStepBox>
        </>
      )}

      
      {error && showError && (
        <>
          <br />
          <Message type="ERROR">
            <ErrorMessage />
          </Message>
        </>
      )}
      <BtnContainer>
        <Btn plant={quotes.plant} onClick={() => onSubmit()}>
        <I18n id={`app.quoteObtaining.schedule.calendar.${quotes.plant}.chooseQuote.buttonText`} />
        </Btn>
      </BtnContainer>
    </LoaderG>
  );
}

export default Summary;
