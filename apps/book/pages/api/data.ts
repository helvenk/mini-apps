import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import iconv from 'iconv-lite';
import { load } from 'cheerio';

type Query = {
  page?: string;
  id?: string;
  download?: string;
};

type Response = {
  message?: string;
  data?: Book[] | FullBook;
};

function getDownloadLink(name: string, type: string) {
  return `https://xiazai.xsqishu.com/${type}/${encodeURI(name)}.${type}`;
}

async function fetchBooks(page: number) {
  if (page < 1) {
    page = 1;
  }

  if (page > 50) {
    page = 50;
  }

  const path = page === 1 ? '' : '_' + page;
  const url = `http://m.qishula.com/newbook/index${path}.html`;
  const { data } = await axios.request({
    url,
    responseType: 'arraybuffer',
  });

  const html = iconv.decode(data, 'GBK');
  const $ = load(html);

  return $('#ulist li > a')
    .map((_, el) => {
      const id = $(el)
        .attr('href')
        .replace('/txt/', '')
        .replace('http://m.qishula.com/book/', '')
        .replace('.html', '');
      const image = $(el).find('img').attr('src');
      const title = $(el).find('p').eq(0).text();
      const author = $(el).find('p').eq(1).text();
      const size = $(el).find('p').eq(2).text();
      const update = $(el).find('p').eq(3).text();
      const desc = $(el).find('p').eq(4).text();

      return {
        id,
        title,
        author,
        size,
        desc,
        update,
        image,
      } as Book;
    })
    .get();
}

async function fetchBook(id: string) {
  const url = `http://m.qishula.com/book/${id}.html`;
  const { data } = await axios.request({
    url,
    responseType: 'arraybuffer',
  });

  const html = iconv.decode(data, 'GBK');
  const $ = load(html);
  const $cover = $('.bookcover');

  const image = $cover.find('.pic img').attr('src');
  const title = $cover.find('h1.title').text();
  const author = $cover.find('p').eq(0).text();
  const cata = $cover.find('p').eq(1).text();
  const size = $cover.find('p').eq(2).text();
  const status = $cover.find('p').eq(3).text();
  const update = $cover.find('p').eq(4).text();
  const desc = $('.bookintro .con').text();

  return {
    id,
    title,
    image,
    author,
    cata,
    size,
    status,
    update,
    desc,
    txtLink: getDownloadLink(title, 'txt'),
    rarLink: getDownloadLink(title, 'rar'),
  } as FullBook;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
) {
  try {
    if (req.method === 'GET') {
      const { page = 1, id, download } = req.query as Query;

      if (id) {
        const book = await fetchBook(id);
        return res.status(200).json({ data: book });
      }

      if (download) {
        const [name, type] = download.split('.');
        const url = getDownloadLink(name, type);
        const response = await axios.request({
          url: url,
          responseType: 'stream',
        });

        res.setHeader(
          'Content-disposition',
          `attachment; filename=${download}`
        );
        return response.data.pipe(res);
      }

      const books = await fetchBooks(Number(page));
      return res.status(200).json({ data: books });
    }

    res.status(400).json({ message: 'unknwon error' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}
