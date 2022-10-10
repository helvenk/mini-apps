/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-namespace */
import mongoose, { Schema, connect, Model } from 'mongoose';
import {
  first,
  isFunction,
  groupBy,
  differenceBy,
} from 'lodash';
import axios from 'axios';
import { Area, Covid } from '../types';

const DEFAULT_COVID_SIZE = 10;

export type Database = {
  Record: Model<Covid>;
};

declare global {
  var mongo: typeof mongoose;
  var database: Database;

  namespace NodeJS {
    interface ProcessEnv {
      MONGODB_URI: string;
      MONGODB_DB?: string;
    }
  }
}

function toJSON<T>(data: any): T {
  const transform = (data: any) => {
    const next = isFunction(data.toJSON) ? data.toJSON() : data;
    return { ...next, _id: data._id.toString() };
  };

  return Array.isArray(data) ? data.map(transform) : transform(data);
}

export async function getDatabase() {
  if (!global.database) {
    const { MONGODB_URI, MONGODB_DB } = process.env;
    const mongo = await connect(MONGODB_URI, {
      dbName: MONGODB_DB ?? 'covid',
    });

    const AreaSchema = new Schema<Area>(
      {
        province: { type: String },
        city: { type: String },
        region: { type: String },
        address: { type: String },
      },
      { _id: false }
    );

    const CovidSchema = new Schema<Covid>(
      {
        high: { type: [AreaSchema] },
        middle: { type: [AreaSchema] },
        low: { type: [AreaSchema] },
        create: { type: Number, index: true, unique: true },
        since: { type: Number },
      },
      { minimize: false }
    );

    const db: Database = {
      Record: mongoose.models.record ?? mongo.model('record', CovidSchema),
    };

    global.mongo = mongo;
    global.database = db;
  }

  return global.database;
}

async function fetchData() {
  type Node = {
    id: string;
    pid: string;
    name: string;
  };

  const url =
    'https://a68962b2-18d0-4812-854e-b4179d81a71f.bspapp.com/http/fengxian';
  const response = await axios.request<Node[]>({ url });
  const nodeMap = groupBy(response.data, 'pId');
  const specialProvinces = ['北京市', '天津市', '上海市', '重庆市'];

  const getArea = (
    province: string,
    city: string,
    region: string,
    address = ''
  ) => {
    const trim = (text = '') => text.split(' -【')[0].replace('【新增】', '');

    if (specialProvinces.includes(province)) {
      return {
        province: trim(province),
        city: trim(province),
        region: trim(city),
        address: trim(region + address),
      } as Area;
    }

    return {
      province: trim(province),
      city: trim(city),
      region: trim(region),
      address: trim(address),
    } as Area;
  };

  const parseAreas = (id: string) => {
    const input = nodeMap[id] ?? [];
    const out: Area[] = [];

    input.forEach((item) => {
      const province = item.name;
      const areas = nodeMap[item.id] ?? [];

      areas.forEach((a) => {
        const city = a.name;
        const regions = nodeMap[a.id] ?? [];

        regions.forEach((r) => {
          const region = r.name;
          const addresses = nodeMap[r.id] ?? [];

          addresses.forEach(({ name: address }) => {
            out.push(getArea(province, city, region, address));
          });

          if (addresses.length === 0) {
            out.push(getArea(province, city, region));
          }
        });
      });
    });

    return out;
  };

  const high = parseAreas('高风险');
  const middle = parseAreas('中风险');
  const time = nodeMap['双击']
    ?.find((o) => o.id === 'tm')
    ?.name.replace('数据时间：', '');

  return {
    create: Date.now(),
    since: new Date(time).getTime(),
    high,
    middle,
    low: [],
  } as Covid;
}

async function getData(size: number) {
  const db = await getDatabase();
  const results = await db.Record.find()
    .sort({ create: 'desc' })
    .limit(size)
    .lean()
    .exec();
  return results as Covid[];
}

function isEqualData(source?: Covid, target?: Covid) {
  if (!source || !target) {
    return false;
  }

  const getAddress = (area: Area) => {
    const { province, city, region, address } = area;
    return province + city + region + address;
  };

  const isEqual = (areas1: Area[] = [], areas2: Area[] = []) => {
    return (
      differenceBy(areas1, areas2, getAddress).length === 0 &&
      differenceBy(areas2, areas1, getAddress).length === 0
    );
  };

  return (
    isEqual(source.high, target.high) &&
    isEqual(source.middle, target.middle) &&
    isEqual(source.low, target.low)
  );
}

export async function getLatestData(size: number = DEFAULT_COVID_SIZE) {
  const db = await getDatabase();
  // eslint-disable-next-line prefer-const
  let [results, latestData] = await Promise.all([getData(size), fetchData()]);

  if (!isEqualData(first(results), latestData)) {
    latestData = await db.Record.create(latestData);
    results = [latestData, ...results];
  }

  return toJSON<Covid[]>(results.slice(0, size));
}
