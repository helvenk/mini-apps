import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import {
  Cell,
  SwipeCell,
  Button,
  Dialog,
  Field,
  FieldInstance,
  Notify,
  Empty,
} from 'react-vant';
import { Plus } from '@react-vant/icons';
import { getRecord } from '../database';
import { Option, syncRecord } from '../utils';

declare module 'react-vant' {
  interface FlexProps {
    children?: ReactNode;
  }
}

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const record = await getRecord();

  if (!record) {
    return {
      redirect: { destination: '/', permanent: false },
    };
  }

  return {
    props: {
      data: record,
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

export default function User({ data: record }: { data: IRecord }) {
  const [data, setData] = useState(record);
  const inputRef = useRef('');

  const { users } = useMemo(() => {
    const { data: userChecks } = data;
    const users = Object.entries(userChecks).map(([name, options]) => {
      return {
        name,
        disabled: options.includes(Option.ABSENT),
      };
    });

    return { users };
  }, [data]);

  const handleRemove = (name: string) => {
    delete data.data[name];
    setData({ ...data });
  };

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
        <title>人员录入</title>
      </Head>
      {users.map(({ name, disabled }) => (
        <SwipeCell
          key={name}
          rightAction={
            <Button
              style={{ height: '100%' }}
              square
              type="danger"
              text={disabled ? '已离职' : '删除'}
              disabled={disabled}
              onClick={() => handleRemove(name)}
            />
          }
        >
          <Cell center title={name} />
        </SwipeCell>
      ))}
      {users.length === 0 && <Empty description="尚无人员，点击下方按钮添加" />}
      <div style={{ marginTop: '1rem', padding: '0.5rem' }}>
        <Button
          icon={<Plus />}
          iconPosition="left"
          color="#44bb97"
          size="large"
          block
          round
          onClick={handleAdd}
        >
          添加人员
        </Button>
        <div className="tips">左滑人员姓名可以删除</div>
      </div>
    </div>
  );
}
