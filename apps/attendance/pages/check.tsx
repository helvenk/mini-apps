import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import {
  Cell,
  SwipeCell,
  ActionSheet,
  Button,
  Dialog,
  Field,
  FieldInstance,
  Flex,
  Notify,
  Empty,
} from 'react-vant';
import { countBy, inRange, omitBy } from 'lodash';
import { getRecord } from '../database';
import { Option, OptionMap, syncRecord, dayjs } from '../utils';

declare module 'react-vant' {
  interface FlexProps {
    children?: ReactNode;
  }
}

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const { id } = query;
  const uid = id
    ? dayjs(Number(id)).startOf('M').toDate().getTime()
    : undefined;
  const record = await getRecord(uid);

  if (!record) {
    return {
      redirect: { destination: '/', permanent: false },
    };
  }

  return {
    props: {
      data: record,
      today: id
        ? dayjs(Number(id)).toDate().getTime()
        : dayjs().toDate().getTime(),
      isFill: !!id,
    },
  };
};

function AutoPrompt({ onChange }: { onChange?: (value: string) => void }) {
  const ref = useRef<FieldInstance>(null);

  useEffect(() => {
    setTimeout(() => {
      ref.current?.focus();
    }, 50);
  }, []);

  return (
    <Field
      className="prompt"
      center
      placeholder="输入姓名"
      border
      ref={ref}
      onChange={onChange}
    />
  );
}

export default function Check({
  data: record,
  today,
  isFill,
  userEditable = false,
}: {
  data: IRecord;
  today: number;
  isFill?: boolean;
  userEditable?: boolean;
}) {
  const [data, setData] = useState(record);
  const [selected, setSelected] = useState('');
  const nameRef = useRef('');
  const inputRef = useRef('');

  const { title, users, todayIndex } = useMemo(() => {
    const { data: userChecks } = data;

    const title = dayjs(today).format(
      isFill ? 'YYYY年M月D日补卡' : 'YYYY年M月D日考勤'
    );
    const todayIndex = dayjs(today).date() - 1;

    const users = Object.entries(
      // 过滤掉以往离职人员
      omitBy(userChecks, (o) =>
        inRange(o.indexOf(Option.ABSENT), 0, todayIndex)
      )
    ).map(([name, options]) => {
      const stat = countBy(options);
      return {
        name,
        stat: [
          '出勤 ' + (stat[Option.WORK] ?? 0),
          '休假 ' + (stat[Option.VACATION] ?? 0),
        ],
        value: OptionMap[options[todayIndex] as Option],
        option: options[todayIndex],
      };
    });

    return { title, users, todayIndex };
  }, [data, isFill, today]);

  const handleRemove = (name: string) => {
    delete data.data[name];
    setData({ ...data });
  };

  const actions = Object.entries(OptionMap).map(([value, name]) => ({
    name,
    className: `check-${value}`,
    callback: () => {
      setSelected((name) => {
        data.data[name][todayIndex] = Number(value);
        setData({ ...data });
        return '';
      });
    },
  }));

  const handleAdd = () => {
    inputRef.current = '';
    Dialog.confirm({
      title: '添加人员',
      confirmButtonColor: '#44bb97',
      message: <AutoPrompt onChange={(v) => (inputRef.current = v)} />,
      onConfirm: () => {
        const name = inputRef.current.trim();
        if (name) {
          if (data.data[name]) {
            Notify.show('该人员已存在');
          } else {
            data.data[name] = [];
            setData({ ...data });
          }
        }
      },
    });
  };

  useEffect(() => {
    if (data !== record) {
      syncRecord(data);
    }
  }, [data, record]);

  useEffect(() => {
    return () => {
      if (data !== record) {
        syncRecord(data);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page">
      <Head>
        <title>{title}</title>
      </Head>
      <Cell.Group title={title}>
        {users.map(({ name, value, option, stat }) => (
          <SwipeCell
            key={name}
            disabled={!userEditable}
            rightAction={
              <Button
                style={{ height: '100%' }}
                square
                type="danger"
                text="删除"
                onClick={() => handleRemove(name)}
              />
            }
          >
            <Cell
              center
              isLink
              title={name}
              value={<span className={`check-${option}`}>{value}</span>}
              label={
                <Flex align="center">
                  {stat.map((t, i) => (
                    <Flex.Item key={i} span={8}>
                      {t}
                    </Flex.Item>
                  ))}
                </Flex>
              }
              onClick={() => {
                nameRef.current = name;
                setSelected(name);
              }}
            />
          </SwipeCell>
        ))}
      </Cell.Group>
      {users.length === 0 && <Empty description="尚未添加人员" />}
      <ActionSheet
        visible={!!selected}
        onCancel={() => setSelected('')}
        description={`${nameRef.current}`}
        actions={actions}
        cancelText="取消"
      />
      {userEditable && (
        <div className="footer-button" onClick={handleAdd}>
          添加人员
        </div>
      )}
    </div>
  );
}
