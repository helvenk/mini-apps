import React, { ChangeEvent, useState, useMemo } from 'react';
import { GetServerSideProps } from 'next';
import dayjs from 'dayjs';
import { groupBy, last, uniq } from 'lodash';
import { getLatestData } from '../server/database';
import { Area, Cell, Covid, RawCovids } from '../types';
import {
  parseSummary,
  parseChanges,
  parseRows,
  downloadExcel,
  parseExcel,
  mergeRows,
  compressCovids,
  decompressCovids,
} from '../utils';

export const getServerSideProps: GetServerSideProps = async () => {
  const data = await getLatestData();
  const raw = compressCovids(data);
  console.log('[%s] GetServerSideProps...', new Date());
  return {
    props: { raw },
  };
};

export default function Index({ raw }: { raw: RawCovids }) {
  const { records, latest } = useMemo(() => {
    const data = decompressCovids(raw);
    return {
      records: data.slice(1).reverse(),
      latest: data[0],
    };
  }, [raw]);

  const [selected, setSelected] = useState<Covid>(last(records) ?? latest);
  const [visible, setVisible] = useState(false);

  const { changes, summary, rows } = useMemo(() => {
    const changes = parseChanges(selected, latest);
    const summary = parseSummary(latest, changes);
    const rows = parseRows(latest, changes);

    return { changes, summary, rows };
  }, [latest, selected]);

  const handleSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const create = Number(e.target.value);
    setSelected(records.find((o) => o.create === create));
  };

  const handleCompare = () => {
    setVisible(true);
  };

  const handleExport = () => {
    const file = parseExcel(summary, rows);
    downloadExcel(file);
  };

  return (
    <div className="container">
      <div className="header">
        <div>
          <span>对比数据：</span>
          <select
            className="select"
            value={selected.create}
            onChange={handleSelect}
          >
            {records.map(({ create }) => (
              <option key={create} value={create}>
                {dayjs(create).format('M月D日HH:mm')}
              </option>
            ))}
          </select>
        </div>
        <button className="button" onClick={handleCompare}>
          查看变化
        </button>
        <button className="button" onClick={handleExport}>
          导出为 Excel
        </button>
      </div>
      <div className="summary">
        {summary.map((text, i) => (
          <span key={i}>{text}</span>
        ))}
      </div>
      {renderTable(rows)}
      {visible && (
        <div className="modal" onClick={() => setVisible(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {renderChanges(changes)}
          </div>
        </div>
      )}
    </div>
  );
}

function renderTable({ high, middle, low }: ReturnType<typeof parseRows>) {
  const rows = mergeRows({ high, middle, low });

  const renderCell = ({
    value,
    level,
    render = true,
    rowspan,
    colspan,
    fresh = false,
  }: Cell) => {
    const text = level === 'address' ? value : `${value}(${rowspan})`;
    return (
      render && (
        <td
          key={text}
          rowSpan={rowspan}
          colSpan={colspan}
          className={fresh ? 'add' : ''}
        >
          {text}
        </td>
      )
    );
  };

  return (
    <table className="table" border={1}>
      <thead>
        <tr>
          <th>风险等级</th>
          <th>省</th>
          <th>市</th>
          <th>县/区</th>
          <th>风险地区</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((cols, i) => (
          <tr key={i}>{cols.map(renderCell)}</tr>
        ))}
      </tbody>
    </table>
  );
}

function renderChanges(changes: ReturnType<typeof parseChanges>) {
  const highAdd = groupBy(changes.high.add, 'province');
  const highRemove = groupBy(changes.high.remove, 'province');
  const middleAdd = groupBy(changes.middle.add, 'province');
  const middleRemove = groupBy(changes.middle.remove, 'province');
  const lowAdd = groupBy(changes.low.add, 'province');
  const lowRemove = groupBy(changes.low.remove, 'province');

  const provinces = uniq([
    ...Object.keys(highAdd),
    ...Object.keys(highRemove),
    ...Object.keys(middleAdd),
    ...Object.keys(middleRemove),
    ...Object.keys(lowAdd),
    ...Object.keys(lowRemove),
  ]);

  const renderCol = (className: string, areas: Area[] = []) => {
    return areas.map(({ region, address }) => {
      const addr = address || region;
      return (
        <div key={addr} className={className}>
          {addr}
        </div>
      );
    });
  };

  return (
    <table className="table" border={1}>
      <thead>
        <tr>
          <td style={{ width: 100 }}>省/市</td>
          <td>高风险地区</td>
          <td>中风险地区</td>
          <td>低风险地区</td>
        </tr>
      </thead>
      <tbody>
        {provinces.map((name) => (
          <tr key={name}>
            <td>{name}</td>
            <td>
              {renderCol('remove', highRemove[name])}
              {renderCol('add', highAdd[name])}
            </td>
            <td>
              {renderCol('remove', middleRemove[name])}
              {renderCol('add', middleAdd[name])}
            </td>
            <td>
              {renderCol('remove', lowRemove[name])}
              {renderCol('add', lowAdd[name])}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
