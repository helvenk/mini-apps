import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Image, Typography, Skeleton, Button, ActionSheet } from 'react-vant';
import axios from 'axios';
import styles from './index.module.less';

const fetchBook = async (id: string) => {
  const { data } = await axios.request<{ data: FullBook }>({
    url: '/api/data',
    params: { id },
  });
  return data.data;
};

export function Book() {
  const { query, isReady } = useRouter();
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState<FullBook>();
  const [visible, setVisible] = useState<string>();

  useEffect(() => {
    console.log('mounted obok')
    const fetchData = async () => {
      try {
        setLoading(true);
        const book = await fetchBook(query.id as string);
        setBook(book);
        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };

    if (isReady) {
      fetchData();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  const handleTxtDownload = () => {
    setVisible(undefined);
    window.location.href =
      visible === 'origin'
        ? book.txtLink
        : `/api/data?download=${encodeURIComponent(`${book.title}.txt`)}`;
  };

  const handleRarDownload = () => {
    setVisible(undefined);
    window.location.href =
      visible === 'origin'
        ? book.rarLink
        : `/api/data?download=${encodeURIComponent(`${book.title}.rar`)}`;
  };

  return (
    <div className={styles.fullbook}>
      <div className={styles.book}>
        <Skeleton
          avatar
          avatarShape="square"
          avatarSize={80}
          row={5}
          style={{ flex: 1 }}
          loading={loading}
        >
          <Image width={100} height={130} src={book?.image} alt="cover" />
          <div className={styles.content}>
            <Typography.Title>{book?.title}</Typography.Title>
            <Typography.Text size="sm">{book?.author}</Typography.Text>
            <Typography.Text size="sm">{book?.cata}</Typography.Text>
            <Typography.Text size="sm">{book?.size}</Typography.Text>
            <Typography.Text size="sm">{book?.status}</Typography.Text>
            <Typography.Text size="sm">{book?.update}</Typography.Text>
          </div>
        </Skeleton>
      </div>
      <div className={styles.desc}>
        <Skeleton loading={loading}>
          <Typography.Text>{book?.desc}</Typography.Text>
        </Skeleton>
      </div>
      {book && (
        <div className={styles.action}>
          <Button
            block
            round
            size="small"
            color="#7232dd"
            onClick={() => setVisible('save')}
          >
            转存下载
          </Button>
          <Button
            type="warning"
            block
            round
            size="small"
            onClick={() => setVisible('origin')}
          >
            源站下载
          </Button>
        </div>
      )}
      <ActionSheet
        visible={!!visible}
        onCancel={() => setVisible(undefined)}
        actions={[
          { name: 'TXT 下载', color: '#9fcb57', callback: handleTxtDownload },
          { name: 'RAR 下载', color: '#4fbbba', callback: handleRarDownload },
        ]}
      />
    </div>
  );
}

export default Book;
