import { enc, SHA256 } from 'crypto-js';
import axios from 'axios';
import { groupBy } from 'lodash';
import dayjs from 'dayjs';
import { Area, Covid } from '../types';

// http://bmfw.www.gov.cn/yqfxdjcx/risk.html
export async function fetchDataFromGov() {
  type Node = {
    area_name: string;
    city: string;
    communitys: string[];
    county: string;
    province: string;
    type: string;
  };

  const fetch = async () => {
    const url = 'http://bmfw.www.gov.cn/bjww/interface/interfaceJson';
    const time = (Date.now() / 1e3).toFixed();
    const i = '23y0ufFl5YxIyGrI8hWRUZmKkvtSjLQA';
    const nonce = '123456789abcdefg';
    const pass = 'zdww';

    const sign = SHA256(time + i + nonce + time)
      .toString(enc.Hex)
      .toUpperCase();

    const body = {
      appId: 'NcApplication',
      paasHeader: pass,
      timestampHeader: time,
      nonceHeader: nonce,
      signatureHeader: sign,
      key: '3C502C97ABDA40D0A60FBEE50FAAD1DA',
    };

    const signature = SHA256(
      time + 'fTN2pfuisxTavbTuYVSsNJHetwq5bJvCQkjjtiLM2dCratiA' + time
    )
      .toString(enc.Hex)
      .toUpperCase();

    const headers = {
      Connection: 'keep-alive',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.67 Safari/537.36',
      'Content-Type': 'application/json; charset=UTF-8',
      Origin: 'http://bmfw.www.gov.cn',
      Referer: 'http://bmfw.www.gov.cn/',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'x-wif-nonce': 'QkjjtiLM2dCratiA',
      'x-wif-signature': signature,
      'x-wif-timestamp': time,
      'x-wif-paasid': 'smt-application',
    };

    const response = await axios.request<{
      data: {
        end_update_time: string;
        highlist: Node[];
        middlelist: Node[];
        lowlist: Node[];
      };
    }>({
      url,
      method: 'POST',
      headers,
      data: body,
    });

    return response.data.data;
  };

  const parseAreas = (data: Node[]) => {
    const out: Area[] = [];

    data.forEach(
      ({ province, city, county: region, communitys: addresses = [] }) => {
        addresses.forEach((address) => {
          out.push({ province, city, region, address });
        });

        if (addresses.length === 0) {
          out.push({ province, city, region, address: '' });
        }
      }
    );

    return out;
  };

  const result = await fetch();

  const high = parseAreas(result.highlist);
  const middle = parseAreas(result.middlelist);
  const low = parseAreas(result.lowlist);
  const time = result.end_update_time.replace('时', '');

  return {
    create: Date.now(),
    since: dayjs(time, 'YYYY-MM-DD HH').toDate().getTime(),
    high,
    middle,
    low,
  } as Covid;
}

// https://static-2c1ea984-de3e-488c-9c66-17561bab77a3.bspapp.com/fengxian/
export async function fetchDataFromOther() {
  type Node = {
    id: string;
    pid: string;
    name: string;
  };

  const url =
    'https://a68962b2-18d0-4812-854e-b4179d81a71f.bspapp.com/http/fengxian';
  console.log('[%s] Fetch covid data...', new Date());
  const response = await axios.request<Node[]>({ url });
  console.log('[%s] Fetch success', new Date());
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
  const low = parseAreas('低风险');
  const time = response.data
    ?.find((o) => o.id === 'tm')
    ?.name.replace('数据时间：', '');

  return {
    create: Date.now(),
    since: dayjs(time, 'YYYY-MM-DD HH:mm:ss').toDate().getTime(),
    high,
    middle,
    low,
  } as Covid;
}

export const fetchData = fetchDataFromGov;
