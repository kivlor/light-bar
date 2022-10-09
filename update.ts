import { sleep, xyToRgb } from './utils.ts';

const getHueBridgeIp = async () => {
  const hueBridgeIp = Deno.env.get('HUE_BRIDGE_IP') || '';
  if (hueBridgeIp) {
    return hueBridgeIp;
  }

  const response = await fetch('https://discovery.meethue.com');
  if (!response.ok) {
    return '';
  }

  const bridges = await response.json();  
  const bridge = Array.isArray(bridges) && bridges[0];
  if (!bridge) {
    return '';
  }

  const { internalipaddress = '' } = bridge;
  return internalipaddress;
}

const getHueUsername = async (bridge) => {
  const hueUsername = Deno.env.get('HUE_USERNAME') || '';
  if (hueUsername) {
    return hueUsername;
  }

  let username = '';
  let tries = 0;

  const appName = Deno.env.get('APP_NAME') || 'light-bar';
  const appInstance = Deno.env.get('APP_INSTANCE') || 'local';

  const url = `http://${bridge}/api`;
  const body = JSON.stringify({
    devicetype: `${appName}#${appInstance}`,
    generateclientkey: true
  });

  while (username == '' && tries < 5) {
    console.log('press button on bridge');
    tries += 1;

    const response = await fetch(url, { method: 'POST', body });
    if (!response.ok) {
      return;
    }

    const json = await response.json();
    const success = Array.isArray(json) && json.find(({ success }) => {
      return success;
    });

    if (success) {
      const credentials = success.success;
      username = credentials?.username;
    } else {
      await sleep(5000);
    }
  }

  return username;
}

const getHuePlayLights = async (bridge, username) => {
  const url = `https://${bridge}/clip/v2/resource/light`;
  const response = await fetch(url, { headers: { 'Hue-Application-Key': username } });
  if (!response.ok) {
    return;
  }

  const { data: lights } = await response.json();
  if (!Array.isArray(lights)) {
    return {};
  }

  const playLights = lights.reduce((acc, item) => {
    const { id, metadata } = item;
    const { archetype, name } = metadata;
    if (archetype !== 'hue_play') {
      return acc;
    }

    const key = name.match(/left/i) ? 'left' : 'right';
    acc[key] = id;

    return acc;
  }, {});

  return playLights;
}

const getHueLightRgb = async (bridge, username, id) => {
  const url = `https://${bridge}/clip/v2/resource/light/${id}`;
  const response = await fetch(url, { headers: { 'Hue-Application-Key': username } });
  if (!response.ok) {
    return;
  }

  const { data: lights } = await response.json();
  const light = Array.isArray(lights) && lights[0];
  if (!light) {
    return;
  }

  const { color, dimming } = light;
  const { xy: { x, y} } = color;
  const { brightness } = dimming;
  
  return xyToRgb(x, y, brightness);
}

const writeColorsToKeyValueStore = async (colors) => {
  const bucket = Deno.env.get('KVDB_BUCKET') || '';
  const writeKey = Deno.env.get('KVDB_WRITE_KEY') || '';

  if (!bucket) {
    console.warn('bucket required to write values to kv store');
    return;
  }

  const url = `https://kvdb.io/${bucket}`;
  const headers = {
    'Authorization': writeKey && `Bearer ${writeKey}`,
    'Content-Type': 'application/json'
  }
  const body = JSON.stringify({
    txn: Object.keys(colors).map((key) => ({ set: key, value: colors[key] }))
  });

  const response = await fetch(url, { method: 'POST', headers, body });
  if (!response.ok) {
    console.warn('unable to write values to kv store');
  }

  return;
}

(async () => {
  const bridge = await getHueBridgeIp();
  if (!bridge) {
    console.warn('unable to find bridge');
    return;
  }

  const username = await getHueUsername(bridge);
  if (!username) {
    console.warn('unable to authenticate');
    return;
  }

  const { left, right } = await getHuePlayLights(bridge, username);

  while (true) {
    const leftRgb = await getHueLightRgb(bridge, username, left);
    const rightRgb = await getHueLightRgb(bridge, username, right);

    await writeColorsToKeyValueStore({
      left: Object.values(leftRgb).join(','),
      right: Object.values(rightRgb).join(',')
    });

    await sleep(5000);
  }
})();
