import { NextApiRequest, NextApiResponse } from 'next';
import { getLatestData } from '../../server/database';
import { compress } from '../../utils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const data = await getLatestData();
    res.status(200).json({ success: true, data: data.map(compress) });
  } catch (err) {
    res.status(500).json({ statusCode: 500, message: err.message });
  }
}
