import { useState, useMemo } from 'react';
import { map, range, isNil } from 'lodash';
import { useRouter } from 'next/router';
import { Button, Calendar, CalendarDayItem, Popup, Cell } from 'react-vant';
import { dayjs } from '../utils';
import { getRecords } from '../database';

export const getServerSideProps = async () => {
  const records = await getRecords();

  if (records.length === 0) {
    return {
      notFound: true,
    };
  }

  return {
    props: { data: records },
  };
};

export default function Index({ data }: { data: IRecord[] }) {
  const router = useRouter();
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const { editable, minDate, maxDate, formatter } = useMemo(() => {
    const { uid, data: userChecks } = data[0];

    // 是当前月可以编辑
    const editable = dayjs().isSame(uid, 'M');

    // 当天索引
    const todayIndex = dayjs().date() - 1;
    // 当月开头
    const minDate = dayjs().startOf('M').toDate();
    // 当天结束
    const maxDate = dayjs().endOf('D').toDate();
    // 当月天数
    const days = dayjs().daysInMonth();
    // 已打卡的日期
    const checkedDays = range(days).map((i) =>
      Object.values(userChecks).some((o) => !isNil(o[i]))
    );

    const formatter = (value: CalendarDayItem) => {
      const { date, type } = value;

      if (!date) {
        return value;
      }

      const index = date.getDate() - 1;
      return {
        ...value,
        // 排除当天
        type: todayIndex !== index && checkedDays[index] ? 'disabled' : type,
      };
    };

    return {
      editable,
      minDate,
      maxDate,
      formatter,
    };
  }, [data]);

  return (
    <div className="page">
      <div className="button-group">
        <Button
          type="info"
          size="large"
          block
          round
          onClick={() => router.push('/check')}
        >
          今日打卡
        </Button>
        <Button
          type="primary"
          size="large"
          block
          round
          onClick={() => router.push('/user')}
        >
          人员录入
        </Button>
        <Button
          type="warning"
          size="large"
          block
          round
          disabled={!editable}
          onClick={() => setCalendarVisible(true)}
        >
          往日补卡
        </Button>
        <Button
          color="#7232dd"
          size="large"
          block
          round
          onClick={() => setPickerVisible(true)}
        >
          查看记录
        </Button>
      </div>
      <Calendar
        title="选择补卡日期"
        defaultDate={null}
        showConfirm={false}
        visible={calendarVisible}
        color="#44bb97"
        minDate={minDate}
        maxDate={maxDate}
        formatter={formatter}
        onClose={() => setCalendarVisible(false)}
        onConfirm={(date) => {
          setCalendarVisible(false);
          router.push(`/check?id=${(date as Date).getTime()}`);
        }}
      />
      <Popup
        round
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        style={{ width: '80%' }}
      >
        <div style={{ padding: '1rem 0' }}>
          {map(data, ({ uid }) => (
            <Cell
              key={uid}
              title={dayjs(uid).format('YYYY年M月考勤表')}
              isLink
              onClick={() => {
                setPickerVisible(false);
                router.push(`/record?id=${uid}`);
              }}
            />
          ))}
        </div>
      </Popup>
    </div>
  );
}
