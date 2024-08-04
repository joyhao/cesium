const token = '7b56707d6a4618fb1835e58163ba2e10';
// 服务域名
const tdtUrl = 'https://t{s}.tianditu.gov.cn/';

export const address = [
  {
    name: '南岸区',
    degrees: [106.5603, 29.5262]
  },
  {
    name: '大渡口区',
    degrees: [106.4745, 29.4897]
  },
  {
    name: '璧山区',
    degrees: [106.222, 29.5975]
  },
  {
    name: '北碚区',
    degrees: [106.3896, 29.8086]
  }
];

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