/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-namespace */
import mongoose, { Schema, connect, Model } from 'mongoose';
import { first, differenceBy, uniqWith } from 'lodash';
import dayjs from 'dayjs';
import { Area, Covid, RawCovid } from '../types';
import { compressCovid, decompressCovid } from '../utils';
import { fetchData } from './source';

const DEFAULT_COVID_SIZE = 10;
// 数据 3天过期
const DEFAULT_DAY_EXPIRE = 3;

export type Database = {
  Record: Model<RawCovid>;
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

export async function getDatabase() {
  if (!global.database) {
    const { MONGODB_URI, MONGODB_DB } = process.env;
    console.log('[%s] Connect mongodb...', new Date());
    const mongo = await connect(MONGODB_URI, {
      dbName: MONGODB_DB ?? 'covid',
    });
    console.log('[%s] Connected', new Date());

    const CovidSchema = new Schema<RawCovid>(
      {
        high: { type: [Array] },
        middle: { type: [Array] },
        low: { type: [Array] },
        dict: { type: [String] },
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

async function getData(size: number) {
  const db = await getDatabase();
  console.log('[%s] Query records from db...', new Date());
  const results = await db.Record.find()
    .sort({ create: 'desc' })
    .limit(size)
    .lean()
    .exec();
  console.log('[%s] Query success', new Date());
  return results.map((o) => decompressCovid(o as any));
}

async function saveData(data: Covid) {
  const db = await getDatabase();
  await db.Record.findOneAndUpdate({ since: data.since }, compressCovid(data), {
    upsert: true,
  });
  return data;
}

export function isEqualCovidData(source?: Covid, target?: Covid) {
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

function isEqualCovid(source?: RawCovid | Covid, target?: RawCovid | Covid) {
  if (!source || !target) {
    return false;
  }

  return source.since === target.since;
}

export async function getLatestData(size: number = DEFAULT_COVID_SIZE) {
  console.log('[%s] Get latest data...', new Date());
  // eslint-disable-next-line prefer-const
  let [results, latestData] = await Promise.all([getData(size), fetchData()]);

  if (!isEqualCovid(first(results), latestData)) {
    console.log('[%s] Found new data...', new Date());
    // insert new data only prod
    if (process.env.NODE_ENV.startsWith('prod')) {
      await saveData(latestData);
    }

    results = [latestData, ...results];
  }

  return uniqWith(results.slice(0, size), isEqualCovid) as Covid[];
}

export async function refreshData() {
  console.log('[%s] Refresh data...', new Date());
  const [results, latestData] = await Promise.all([getData(1), fetchData()]);

  if (!isEqualCovid(first(results), latestData)) {
    console.log('[%s] Found new data...', new Date());
    await saveData(latestData);
  }

  const expires = dayjs()
    .startOf('d')
    .subtract(DEFAULT_DAY_EXPIRE, 'd')
    .toDate();
  console.log('[%s] Delete expired data less than %s ...', new Date(), expires);
  const db = await getDatabase();
  await db.Record.deleteMany({ create: { $lt: expires.getTime() } });
}
