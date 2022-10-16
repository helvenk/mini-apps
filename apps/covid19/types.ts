export type Area = {
  province: string;
  city: string;
  region: string;
  address: string;
};

export type RawArea = [
  province: string,
  city: string,
  region: string,
  address: string
];

export type Cell = {
  level?: keyof Area;
  value: string;
  render?:boolean;
  rowspan?: number;
  colspan?: number;
  fresh?: boolean;
};

export type Covid = {
  high: Area[];
  middle: Area[];
  low: Area[];
  create: number;
  since: number;
};

export type RawCovid = {
  high: RawArea[];
  middle: RawArea[];
  low: RawArea[];
  create: number;
  since: number;
  dict: string[];
};
