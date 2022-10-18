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
  render?: boolean;
  rowspan?: number;
  colspan?: number;
  fresh?: boolean;
};

export type RawCovid<T = RawArea> = {
  high: T[];
  middle: T[];
  low: T[];
  create: number;
  since: number;
  dict: string[];
};

export type Covid = RawCovid<Area>;

export type RawCovids = {
  dict: string[];
  data: RawCovid[];
};
