import axios from 'axios';
import DayJS from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

DayJS.extend(utc);
DayJS.extend(timezone);

const TIME_ZONE = 'Asia/Hong_Kong';

export const dayjs = (date: DayJS.ConfigType = Date.now()) => {
  return DayJS.tz(date, TIME_ZONE);
};

export enum Option {
  // 出勤
  WORK = 0,
  // 休假
  VACATION = 1,
  // 请假
  // LEAVE = 2,
  // 离职
  ABSENT = 3,
}

export const OptionMap = {
  [Option.WORK]: '出勤',
  [Option.VACATION]: '休假',
  [Option.ABSENT]: '离职',
};

export const OptionShortMap = {
  [Option.WORK]: '√',
  [Option.VACATION]: '休',
  [Option.ABSENT]: '离',
};

export async function syncRecord(data: IRecord) {
  const res = await axios.request({
    url: '/api/records',
    method: 'POST',
    data: { data },
  });

  return res.data as IRecord;
}
