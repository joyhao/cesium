import { Cartesian3 } from 'cesium';

const token = '7b56707d6a4618fb1835e58163ba2e10';
// 服务域名
const tdtUrl = 'https://t{s}.tianditu.gov.cn/';
export interface iAddress {
  name: string;
  show: boolean;
  degrees: [number, number];
  x?: number;
  y?: number;
  left?: number;
  top?: number;
  ele?: HTMLElement;
}

function random() {
  return Math.random() * 10;
}

function createAddress() {
  const len = 100;
  const list = [];
  for (let i = 0; i < len; i++) {
    const item = {
      name: `test${i}`,
      show: false,
      degrees: [106.5576 + random(), 29.5261 + random()]
    };
    list.push(item);
  }

  return list;
}

export const address: iAddress[] = [
  {
    name: '南岸区',
    show: false,
    degrees: [106.5576, 29.5261]
  },
  {
    name: '大渡口区',
    show: false,
    degrees: [106.4745, 29.4897]
  },
  {
    name: '璧山区',
    show: false,
    degrees: [106.222, 29.5975]
  },
  {
    name: '北碚区',
    show: false,
    degrees: [106.3896, 29.8086]
  }
  // ...createAddress()
];
export function getAddress() {
  const list: iAddress[] = [];
  for (let i = 0; i < address.length; i++) {
    const item = address[i];

    const os = {
      ...item,
      show: false,
      ele: document.getElementById(item.name) as HTMLElement
    };
    list.push(os);
  }

  console.log(list);

  return list;
}

export const MAP = {
  // 服务负载子域
  subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
  // //在线天地图影像服务地址(墨卡托投影)
  TDT_IMG_W: tdtUrl + 'DataServer?T=img_w&x={x}&y={y}&l={z}&tk=' + token,
  //在线天地图影像中文标记服务(墨卡托投影)
  TDT_CVA_W: tdtUrl + 'DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=' + token,
  //在线天地图影 国界服务(墨卡托投影)
  TDT_IBO_W: tdtUrl + 'DataServer?T=ibo_w&x={x}&y={y}&l={z}&tk=' + token
};
