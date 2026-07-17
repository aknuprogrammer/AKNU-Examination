/**
 * Parse browser and device from User-Agent string
 * @param {string} uaHeader User-Agent header from request
 * @returns {object} { browser, device }
 */
export function parseUserAgent(uaHeader) {
  if (!uaHeader) {
    return { browser: 'Unknown', device: 'Unknown' };
  }

  let browser = 'Unknown';
  let device = 'Desktop';

  // Parse Device
  if (/android/i.test(uaHeader)) {
    device = 'Android Device';
  } else if (/ipad/i.test(uaHeader)) {
    device = 'iPad';
  } else if (/iphone/i.test(uaHeader)) {
    device = 'iPhone';
  } else if (/macintosh/i.test(uaHeader)) {
    device = 'Macintosh';
  } else if (/windows/i.test(uaHeader)) {
    device = 'Windows PC';
  } else if (/linux/i.test(uaHeader)) {
    device = 'Linux PC';
  }

  // Parse Browser
  if (/edg/i.test(uaHeader)) {
    browser = 'Microsoft Edge';
  } else if (/chrome|crios/i.test(uaHeader) && !/opr/i.test(uaHeader)) {
    browser = 'Google Chrome';
  } else if (/safari/i.test(uaHeader) && !/chrome|crios/i.test(uaHeader)) {
    browser = 'Safari';
  } else if (/firefox|fxios/i.test(uaHeader)) {
    browser = 'Mozilla Firefox';
  } else if (/opr/i.test(uaHeader)) {
    browser = 'Opera';
  } else if (/trident/i.test(uaHeader)) {
    browser = 'Internet Explorer';
  }

  return { browser, device };
}
