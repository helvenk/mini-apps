import type { NextApiRequest, NextApiResponse } from 'next';
import { updateRecord } from '../../database';

type Payload = {
  data: IRecord;
};

type Response = {
  data?: unknown;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  try {
    if (req.method === 'POST') {
      const { data } = req.body as Payload;
      const record = await updateRecord(data);
      return res.status(200).json({ data: record });
    }

    res.status(400).json({});
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
}
