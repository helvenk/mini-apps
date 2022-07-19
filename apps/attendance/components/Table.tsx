import { useMemo } from 'react';
import { filter, range, sumBy, countBy } from 'lodash';
import { Option, OptionShortMap, dayjs } from '../utils';

export default function RTable({
  data,
  showTitle = false,
}: {
  data: IRecord;
  showTitle?: boolean;
}) {
  const { columns, rows, groups, minWidth } = useMemo(() => {
    const { uid, data: userChecks } = data;
    const days = dayjs(uid).daysInMonth();

    const columns = [
      { title: '姓名', width: '6em' },
      { title: '上班天数', width: '3em' },
      { title: '休假天数', width: '3em' },
      { title: '请假天数', width: '3em' },
      ...range(days).map((n) => ({ title: n + 1, width: '2rem' })),
      { title: '奖', width: '3em' },
      { title: '罚', width: '3em' },
      { title: '备注', width: '6em' },
    ];

    const groups = filter(columns, 'width');

    const minWidth = sumBy(groups, (o) => Number.parseInt(o.width, 10));

    const rows = Object.entries(userChecks).map(([name, options]) => {
      const stat = countBy(options);

      return [
        name,
        stat[Option.WORK],
        stat[Option.VACATION],
        '',
        ...range(days).map((i) => OptionShortMap[options[i] as Option]),
      ];
    });

    return { columns, rows, groups, minWidth };
  }, [data]);

  return (
    <div className="table">
      <table border={1} style={{ width: `${minWidth}em` }}>
        <colgroup>
          {groups.map(({ width }, i) => (
            <col key={i} style={{ width }}></col>
          ))}
        </colgroup>
        <thead>
          {showTitle && (
            <tr>
              <th className="title" colSpan={columns.length}>
                {dayjs(data.uid).format('YYYY年M月考勤表')}
              </th>
            </tr>
          )}
          <tr>
            {columns.map(({ title }) => (
              <td key={title}>{title}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cols, i) => (
            <tr key={i}>
              {columns.map(({ title }, j) => (
                <td key={title}>{cols[j]}</td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot></tfoot>
      </table>
    </div>
  );
}
