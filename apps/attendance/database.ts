/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-namespace */
import mongoose, { Schema, connect, Model } from 'mongoose';
import { mapValues, omitBy, pick } from 'lodash';
import { dayjs, Option } from './utils';

export type Database = {
  Record: Model<IRecord>;
};

declare global {
  var mongo: typeof mongoose;
  var database: Database;

  namespace NodeJS {
    interface ProcessEnv {
      MONGODB_URI: string;
      MONGODB_DB: string;
    }
  }
}

function toJSON(data: IRecord) {
  return pick(data, ['uid', 'data']);
}

export async function getDatabase() {
  if (!global.database) {
    const mongo = await connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB,
    });

    const record = new Schema<IRecord>(
      {
        uid: { type: Number, index: true, required: true },
        data: { type: Object, default: {} },
      },
      { minimize: false }
    );

    const db: Database = {
      Record: mongo.model('record', record),
    };

    global.mongo = mongo;
    global.database = db;
  }

  return global.database;
}

async function _getRecords(size: number) {
  const db = await getDatabase();
  const results = await db.Record.find()
    .sort({ uid: 'desc' })
    .limit(size)
    .lean()
    .exec();
  return results.map(toJSON);
}

export async function getRecord(uid?: number) {
  if (!uid) {
    uid = dayjs().startOf('M').toDate().getTime();
  }

  const db = await getDatabase();
  let record = await db.Record.findOne({ uid }).lean().exec();

  if (!record) {
    const [prevRecord] = await _getRecords(1);
    const userMap = prevRecord?.data ?? {};
    record = await db.Record.create({
      uid,
      data: mapValues(
        omitBy(userMap, (o) => o.includes(Option.ABSENT)),
        (_) => []
      ),
    });
  }

  return toJSON(record);
}

export async function getRecords(size = 6) {
  // 刷新当月数据
  await getRecord();
  return _getRecords(size);
}

export async function updateRecord(record: IRecord) {
  const { uid, data } = record;
  const db = await getDatabase();
  await db.Record.updateOne({ uid }, { data }).exec();
  return record;
}
