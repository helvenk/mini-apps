import { Search, List, Image, Typography } from 'react-vant';
import { useEffect, useLayoutEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useCache } from '../utils';
import styles from './index.module.less';

const PAGE_SIZE = 10;
const MAX_PAGE = 50;

const fetchBooks = async (page = 1) => {
  const { data } = await axios.request<{ data: Book[] }>({
    url: '/api/data',
    params: { page },
  });
  return data.data;
};

export function Index() {
  const cache = useCache<{ books: Book[]; finished: boolean; top: number }>();
  const [books, setBooks] = useState(cache.get()?.books ?? []);
  const [finished, setFinished] = useState(!!cache.get()?.finished);

  const onLoad = async () => {
    const page = Math.ceil(books.length / PAGE_SIZE) + 1;
    const data = await fetchBooks(page);
    const state = [...books, ...data];
    setBooks(state);
    cache.save({ books: state, finished: page >= MAX_PAGE, top: 0 });

    if (page >= MAX_PAGE) {
      setFinished(true);
    }
  };

  const handleSearch = (val: string) => {};

  useLayoutEffect(() => {
    const top = cache.get()?.top;
    if (top) {
      window.scrollTo(0, top);
    }

    return () => {
      const data = cache.get();

      if (data) {
        data.top = document.documentElement.scrollTop;
        cache.save(data);
      }
    };
  }, [cache]);

  return (
    <div className={styles.page}>
      <Search onSearch={handleSearch} />
      <List className={styles.list} finished={finished} onLoad={onLoad}>
        {books.map(
          ({ id, title, author, size, update, image, desc }, index) => (
            <Link key={id + index} href={{ pathname: '/book', query: { id } }}>
              <div className={styles.book}>
                <Image width={80} height={100} src={image} alt="cover" />
                <div className={styles.content}>
                  <Typography.Title level={6}>{title}</Typography.Title>
                  <Typography.Text size="sm">{author}</Typography.Text>
                  <Typography.Text size="sm">{size}</Typography.Text>
                  <Typography.Text size="sm">{update}</Typography.Text>
                  <Typography.Text ellipsis={1} size="sm">
                    {desc}
                  </Typography.Text>
                </div>
              </div>
            </Link>
          )
        )}
      </List>
    </div>
  );
}

export default Index;
