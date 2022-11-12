import { map, groupBy, differenceBy } from 'lodash';
import { Workbook, Font, Alignment } from 'exceljs';
import dayjs from 'dayjs';
import { Covid, Area, Cell, RawArea, RawCovid, RawCovids } from '../types';

export function getAddress(area: Area) {
  const { province, city, region, address } = area;
  return province + city + region + address;
}

export function isEqualArea(area1: Area, area2: Area) {
  return getAddress(area1) === getAddress(area2);
}

export function parseChanges(before: Covid, after: Covid) {
  const compare = (areas1: Area[], areas2: Area[]) =>
    differenceBy(areas1, areas2, getAddress);

  return {
    high: {
      add: compare(after.high, before.high),
      remove: compare(before.high, after.high),
    },
    middle: {
      add: compare(after.middle, before.middle),
      remove: compare(before.middle, after.middle),
    },
    low: {
      add: compare(after.low, before.low),
      remove: compare(before.low, after.low),
    },
  };
}

export function parseSummary(
  data: Covid,
  changes?: ReturnType<typeof parseChanges>
) {
  const time = `截至 ${dayjs().format('YYYY年MM月DD日H时')}，`;

  const getLevelSummary = (
    areas: Area[],
    level: string,
    changes: { add: Area[]; remove: Area[] } = { add: [], remove: [] }
  ) => {
    let summary = '';
    let add = '';
    let remove = '';

    if (areas.length > 0) {
      const provinceMap = groupBy(areas, 'province');
      const provinceSum = Object.keys(provinceMap)
        .map((name) => `${name} ${provinceMap[name].length} 个`)
        .join('；');
      summary += '：';
      summary += provinceSum;
    }

    if (changes.add.length > 0) {
      const provinceMap = groupBy(changes.add, 'province');
      add += `${level}地区增加 ${changes.add.length} 个`;
      add += '（';
      add += Object.keys(provinceMap)
        .map((name) => `${name} ${provinceMap[name].length} 个`)
        .join('、');
      add += '）。';
    }

    if (changes.remove.length > 0) {
      const provinceMap = groupBy(changes.remove, 'province');
      remove += `${level}地区减少 ${changes.remove.length} 个`;
      remove += '（';
      remove += Object.keys(provinceMap)
        .map((name) => `${name} ${provinceMap[name].length} 个`)
        .join('、');
      remove += '）。';
    }

    return `全国共有${level}地区 ${areas.length} 个${summary}。${add}${remove}`;
  };

  return [
    time,
    getLevelSummary(data.high, '高风险', changes?.high),
    getLevelSummary(data.middle, '中风险', changes?.middle),
    getLevelSummary(data.low, '低风险', changes?.low),
  ];
}

export function parseRows(
  data: Covid,
  changes?: ReturnType<typeof parseChanges>
) {
  const levelMap: (keyof Area)[] = ['province', 'city', 'region', 'address'];

  const parseCols = (
    areas: Area[],
    changes: { add: Area[]; remove: Area[] } = { add: [], remove: [] },
    cols: Cell[][] = levelMap.map((_) => []),
    level = 0
  ) => {
    if (level >= levelMap.length) {
      return cols;
    }

    const levelName = levelMap[level];
    const areasGroup = groupBy(areas, levelName);

    Object.keys(areasGroup).forEach((name) => {
      const areasByLevel = areasGroup[name];

      areasByLevel.forEach((area, index) => {
        const { province, city } = area;
        const isSpecialProvince = levelName === 'province' && province === city;
        const isSpecialCity = levelName === 'city' && province === city;

        cols[level].push({
          level: levelName,
          value: name,
          render: !isSpecialCity && index === 0,
          rowspan: areasByLevel.length,
          // 省市合并
          colspan: isSpecialProvince ? 2 : isSpecialCity ? 0 : 1,
          fresh:
            levelName === 'address' &&
            changes.add.some((o) => isEqualArea(o, area)),
        });
      });

      parseCols(areasByLevel, changes, cols, level + 1);
    });

    return cols;
  };

  const colsToRows = (cols: Cell[][]) => {
    const size = Math.max(...cols.map((col) => col.length));
    return Array.from({ length: size }, (_, i) => cols.map((col) => col[i]));
  };

  const highCols = parseCols(data.high, changes?.high);
  const middleCols = parseCols(data.middle, changes?.middle);
  const lowCols = parseCols(data.low, changes?.low);

  return {
    high: colsToRows(highCols),
    middle: colsToRows(middleCols),
    low: colsToRows(lowCols),
  };
}

export function mergeRows({ high, middle, low }: ReturnType<typeof parseRows>) {
  return [
    ...high.map((row, i) => [
      { value: '高风险地区', render: i === 0, rowspan: high.length },
      ...row,
    ]),
    ...middle.map((row, i) => [
      { value: '中风险地区', render: i === 0, rowspan: middle.length },
      ...row,
    ]),
    ...low.map((row, i) => [
      { value: '低风险地区', render: i === 0, rowspan: low.length },
      ...row,
    ]),
  ] as Cell[][];
}

export function parseExcel(
  summary: string[],
  { high, middle, low }: ReturnType<typeof parseRows>
) {
  const rows = mergeRows({ high, middle, low });

  const workbook = new Workbook();
  workbook.creator = 'Limmio';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet();

  const baseFont: Partial<Font> = { size: 12 };
  const titleFont: Partial<Font> = { size: 18 };
  const alignment: Partial<Alignment> = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true,
  };
  const rowHeight = sheet.properties.defaultRowHeight;
  const wordsOfLine = 55;

  const columns = [
    { key: 'level', value: '风险等级', width: 15 },
    { key: 'province', value: '省', width: 12 },
    { key: 'city', value: '市', width: 12 },
    { key: 'region', value: '县/区', width: 30 },
    { key: 'address', value: '风险地区', width: 60 },
  ];

  // 表头行
  const headerRow = sheet.addRow(map(columns, 'value'));
  headerRow.height = 32;

  columns.forEach(({ width }, i) => {
    const column = sheet.getColumn(i + 1);
    column.width = width;
    column.alignment = alignment;
    column.font = baseFont;

    const cell = headerRow.getCell(i + 1);
    cell.font = { ...baseFont, bold: true };
  });

  // 第一行
  const title = '全国疫情中高风险地区（实时更新）';
  const titleRow = sheet.insertRow(1, [title]);
  titleRow.height = 55;
  titleRow.font = titleFont;
  titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.mergeCells('A1:E1');

  // 第二行
  const note = summary.join('');
  const noteRow = sheet.insertRow(2, [note]);
  noteRow.height = Math.max(
    55,
    Math.ceil((note.length / wordsOfLine) * rowHeight)
  );
  noteRow.font = baseFont;
  noteRow.alignment = {
    vertical: 'middle',
    horizontal: 'left',
    wrapText: true,
  };
  sheet.mergeCells('A2:E2');

  const rowOffset = sheet.actualRowCount;
  // 插入表格
  rows.forEach((row) => {
    sheet.addRow(
      map(row, ({ value, rowspan, level }) =>
        level === 'address' ? value : `${value}(${rowspan})`
      )
    );
  });

  // 合并表格单元、样式
  rows.forEach((row, rowIndex) => {
    row.forEach(
      ({ rowspan = 1, colspan = 1, fresh, render = true }, colIndex) => {
        if (!render) {
          return;
        }

        const rowStart = rowOffset + rowIndex + 1;
        const colStart = colIndex + 1;

        if (rowspan > 1) {
          const rowEnd = rowStart + rowspan - 1;
          const colEnd = colStart + colspan - 1;
          sheet.mergeCells(rowStart, colStart, rowEnd, colEnd);
        }

        if (fresh) {
          const cell = sheet.getCell(rowStart, colStart);
          if (cell) {
            cell.font = { ...cell.font, color: { argb: 'FFFF0000' } };
          }
        }
      }
    );
  });

  // 添加边框
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  return workbook;
}

export function downloadFile(file: Blob, name: string) {
  const link = document.createElement('a');
  link.style.display = 'none';
  link.download = name;
  link.href = URL.createObjectURL(file);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadExcel(workbook: Workbook, name?: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const time = dayjs(workbook.created).format('M月D日');
  const filename = name ?? `${time}全国中高风险地区明细.xlsx`;
  downloadFile(new Blob([buffer]), filename);
}

export function compressCovids(data: Covid[]): RawCovids {
  const dict: Record<string | number, string | number> = {};
  const rawDict: string[] = [];
  let index = -1;

  const addDict = (key: string) =>
    dict[key] ??
    ((index += 1),
    (rawDict[index] = key),
    (dict[key] = index),
    (dict[index] = key),
    index);

  const compressAreas = (areas: Area[]) =>
    areas.map(
      ({ province, city, region, address }) =>
        [
          addDict(province),
          addDict(city),
          addDict(region),
          addDict(address),
        ] as RawArea
    );

  const compressCovid = ({ high, middle, low, since, create }: Covid) => {
    return {
      since,
      create,
      high: compressAreas(high),
      middle: compressAreas(middle),
      low: compressAreas(low),
      dict: [],
    } as RawCovid;
  };

  return {
    data: data.map(compressCovid),
    dict: rawDict,
  };
}

export function compressCovid(data: Covid) {
  const { data: rawCovids, dict } = compressCovids([data]);
  return { ...rawCovids[0], dict } as RawCovid;
}

export function decompressCovids({ dict, data }: RawCovids): Covid[] {
  const restoreArea = ([p, c, r, a]: RawArea): Area => ({
    province: dict[p],
    city: dict[c],
    region: dict[r],
    address: dict[a],
  });

  const restoreCovid = ({ since, create, high, middle, low }: RawCovid) => {
    return {
      since,
      create,
      high: high.map(restoreArea),
      middle: middle.map(restoreArea),
      low: low.map(restoreArea),
      dict: [],
    };
  };

  return data.map(restoreCovid);
}

export function decompressCovid(rawCovid: RawCovid) {
  const [covid] = decompressCovids({ data: [rawCovid], dict: rawCovid.dict });
  return covid;
}
