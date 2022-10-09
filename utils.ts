export const sleep = (time) => {
  return new Promise((resolve) => setTimeout(resolve, time));
}

// adapted from:
// https://stackoverflow.com/questions/22894498/philips-hue-convert-xy-from-api-to-hex-or-rgb#22918909
export const xyToRgb = (x, y, brightness): number[] => {
  const z = 1.0 - x - y;

  const Y = brightness / 255.0;
  const X = (Y / y) * x;
  const Z = (Y / y) * z;

  // convert to rgb using wide rgb d65 conversion
  const rgb = {
    red: X * 1.612 - Y * 0.203 - Z * 0.302,
    green: -X * 0.509 + Y * 1.412 + Z * 0.066,
    blue: X * 0.026 - Y * 0.072 + Z * 0.962,
  };

  // apply reverse gamma correction
  rgb.red = rgb.red <= 0.0031308 ? 12.92 * rgb.red : (1.0 + 0.055) * Math.pow(rgb.red, (1.0 / 2.4)) - 0.055;
  rgb.green = rgb.green <= 0.0031308 ? 12.92 * rgb.green : (1.0 + 0.055) * Math.pow(rgb.green, (1.0 / 2.4)) - 0.055;
  rgb.blue = rgb.blue <= 0.0031308 ? 12.92 * rgb.blue : (1.0 + 0.055) * Math.pow(rgb.blue, (1.0 / 2.4)) - 0.055;

  // divide by max
  const max = Math.max(rgb.red, rgb.green, rgb.blue);
  rgb.red = rgb.red / max;
  rgb.green = rgb.green / max;
  rgb.blue = rgb.blue / max;

  // convert for web
  rgb.red = rgb.red * 255;
  rgb.green = rgb.green * 255;
  rgb.blue = rgb.blue * 255;

  rgb.red = rgb.red < 0 ? 255 : Math.floor(rgb.red);
  rgb.green = rgb.green < 0 ? 255 : Math.floor(rgb.green);
  rgb.blue = rgb.blue < 0 ? 255 : Math.floor(rgb.blue);

  return rgb;
}
