import React, { useState, useCallback } from "react";
import styled from "styled-components";
import { IQuote } from "../../contexts/QuoteObtaining";
import {
  getStringDateWithYear,
  capitalizeFirstChar,
} from "lib/commonFunctions";
import I18n from "components/common/i18n";
import useQuoteObtaining from "hooks/useQuoteObtaining";
import DatePicker from "./DatePicker";
import {Btn} from "components/common/styles/UtilsStyles"

const CalendarContainer = styled.div`
  position: relative;
  margin-top: 14px;
  background: #f9f9f9;
  padding: 18px 24px 35px 24px;
  @media (max-width: 996px) {
    background: #ffffff;
    padding-left: 0;
    padding-right: 0;
    padding-top: 0;
    margin-top: 19px;
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
  @media (max-width: 996px) {
    display: none;
  }
`;

const FlexContainer = styled.div`
  position: relative;
  display: flex;
  align-items: flex-start;
  padding-top: 26px;
  flex-wrap: wrap;
  @media (max-width: 996px) {
    padding-top: 0;
    flex-wrap: wrap;
  }
`;

const AsideDatePicker = styled.div`
  width: 300px;
  margin-left: 55px;
  @media (max-width: 996px) {
    margin-left: 0;
    margin-top: 27px;
    min-width: 100%;
  }
`;

const Subtitle = styled.div`
  font-family: Nunito-SemiBold;
  font-size: 16px;
  font-stretch: normal;
  font-style: normal;
  line-height: normal;
  letter-spacing: -0.39px;
  color: #000000;
`;

const DateSelected = styled.div`
  font-family: Nunito-Regular;
  font-size: 16px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: normal;
  letter-spacing: -0.39px;
  color: #000000;
  margin-top: 6px;
`;

const SubtitleItem = styled.div`
  margin-top: 6px;
  font-family: Nunito-Bold;
  font-size: 18px;
`;

const DateConfirm = styled.div`
  text-align: right;
  font-family: Nunito-SemiBold;
  margin-top: 22px;
  @media (max-width: 996px) {
    margin-top: 33px;
  }
`;



const ShiftSelection = styled.select`
  width: 75px;
  background: white;
  border: 1px solid grey;
  height: 30px;
  padding-left: 8px;
  padding-top: 3px;
  border-radius: 3px;
  margin-top: 10px;
  font-size: 16px;
`;

function Calendar(): JSX.Element {

  const [{ quotes, quoteSelected }, { onSelectDate, resetShift }] = useQuoteObtaining();

  const normalizeDay = (value?: string) => (value || '').slice(0, 10);
  
  const getShiftsByDay = (day: string) => {
    const normalizedDay = normalizeDay(day);
    return quotes.turnos.filter((record) => normalizeDay(record.fecha) === normalizedDay);
  };

  const getShiftByHour = (hour: string): IQuote | undefined => {
    const dayQuotes = getShiftsByDay(selectedDay);
    return dayQuotes.find((record) => record.hora === hour);
  };

  const initialDay = quoteSelected.fecha || quotes.dias[0] || '';
  const initialShifts = getShiftsByDay(initialDay);
  const initialShift = quoteSelected.hora || initialShifts[0]?.hora || '';

  const [availableShifts, setAvailableShifts] = useState<IQuote[]>(initialShifts);
  const [selectedDay, setSelectedDay] = useState<string>(initialDay);
  const [selectedShift, setSelectedShift] = useState<string>(initialShift);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>(
    quoteSelected.id || initialShifts[0]?.id || ''
  );
  const [selectedLineId, setSelectedLineId] = useState<string>(
    quoteSelected.lineId || initialShifts[0]?.lineId || ''
  );

  const onSubmit = useCallback(() => {
    if (!selectedShift) return;
    onSelectDate(selectedQuoteId, selectedDay, selectedShift, selectedLineId);
  }, [onSelectDate, selectedQuoteId, selectedDay, selectedShift, selectedLineId]);

  const handleSelectedDay = useCallback((selectedDay) => {
    const dayShifts = getShiftsByDay(selectedDay);
    setSelectedDay(selectedDay);
    setAvailableShifts(dayShifts);

    if (!dayShifts.length) {
      setSelectedShift('');
      setSelectedQuoteId('');
      setSelectedLineId('');
      return;
    }

    if (quoteSelected.hora) {
      setSelectedShift(quoteSelected.hora);
      resetShift();
      return;
    }
    setSelectedShift(dayShifts[0].hora);
    setSelectedQuoteId(dayShifts[0].id || '');
    setSelectedLineId(dayShifts[0].lineId || '');
  }, []);

  const handleChangeShift = (e) => {
    const quoteHour = e.target.value;
    const quote = getShiftByHour(quoteHour);
    if (!quote) return;
    setSelectedShift(quote.hora);
    setSelectedQuoteId(quote.id || '');
    setSelectedLineId(quote.lineId || '');
  };

  return (
  <CalendarContainer>
    <ChooseMessage>
      <I18n id="app.quoteObtaining.schedule.calendar.subtitle" />
    </ChooseMessage>
    <FlexContainer>
      <DatePicker changeDaySelected={handleSelectedDay} />
      <AsideDatePicker>
        <Subtitle>
          <SubtitleItem>
            <I18n id="app.quoteObtaining.schedule.calendar.subtitleDate" />
          </SubtitleItem>
        </Subtitle>
        <DateSelected>
          {selectedDay &&
            capitalizeFirstChar(getStringDateWithYear(selectedDay))}
        </DateSelected>
        <br />
        <Subtitle>
          <SubtitleItem>
            <I18n id="app.quoteObtaining.schedule.calendar.subtitleTime" />
          </SubtitleItem>
        </Subtitle>
        <ShiftSelection
          value={selectedShift}
          onChange={handleChangeShift}
        >
          {availableShifts.map((shift, index) => (
            <option key={`${shift.id || shift.lineId || 'slot'}-${shift.fecha}-${shift.hora}-${index}`} value={shift.hora}>
              {shift.hora.substr(0, 5)}
            </option>
          ))}
        </ShiftSelection>
      </AsideDatePicker>
    </FlexContainer>
    <DateConfirm>
      <Btn plant={quotes.plant} onClick={onSubmit}>
        <I18n id="app.quoteObtaining.schedule.calendar.continue" />
      </Btn>
    </DateConfirm>
  </CalendarContainer>
);
}

export default Calendar;
