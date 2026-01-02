import React from "react";
import useQuoteObtaining from "hooks/useQuoteObtaining";
import StepTitle from "components/common/StepTitle";
import I18n from "components/common/i18n";
import GreyStepBox from "components/common/GreyStepBox";
import styled from "styled-components";
import { capitalizeFirstChar, getStringDate } from "lib/commonFunctions";
import Image from "next/image";
import {Btn} from "components/common/styles/UtilsStyles"
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

const ImgContainer = styled.div`
  border-radius: 8px;
`;

const BtnContainer = styled.div`
  text-align: right;
  font-family: Nunito-SemiBold;
  margin-top: 22px;
  @media (max-width: 996px) {
    margin-top: 33px;
  }
`;

function SelectPaymentMethod() {
  const [{ quotes,quoteSelected, paymentPlatform, vehicleType, nombre, email, dominio, anio, telefono, fuelType },
    { onModifyDateAddressChange, onChangePaymentPlatform, onSubmitPaymentPlatform, onModifyVehicleType, onModifyPersonalInfo }] =
    useQuoteObtaining();
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

      <StepTitle plant={quotes.plant} checked  stepNumber={2}>
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

      <StepTitle plant={quotes.plant} stepNumber={4}>
        <I18n id="app.quoteObtaining.schedule.calendar.step4.title" />
      </StepTitle>

      <GreyStepBox>
        <>
          <input onClick={()=>onChangePaymentPlatform("mercadoPago")}
            disabled
            type="radio"
            id="MercadoPago"
            name="paymentPlatform"
            value="MercadoPago"
            defaultChecked={paymentPlatform==='mercadoPago'}
          />
          <label style={{marginLeft: "5px"}} htmlFor="MercadoPago">Mercado Pago</label>
          <ImgContainer>
            <Image
              className="platform"
              src="/img/meli.png"
              alt="pepe"
              width="200"
              height="65"
            />
          </ImgContainer>
          <BtnContainer>
          <Btn plant={quotes.plant} onClick={()=> onSubmitPaymentPlatform()}>
          <I18n id="app.quoteObtaining.schedule.calendar.continue" />
        </Btn>
          </BtnContainer>
          
        </>
      </GreyStepBox>
    </>
  );
}

export default SelectPaymentMethod;
