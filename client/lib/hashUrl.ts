export function encodeVCode(vcode?: string): string {
  if (!vcode) return "unknown";
  let hex = '';
  for (let i = 0; i < vcode.length; i++) {
    hex += vcode.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
}

export function decodeVCode(hex?: string): string {
  if (!hex || hex === "unknown") return "";
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16));
  }
  return str;
}
