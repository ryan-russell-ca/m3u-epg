import Logger from '@/api-lib/modules/Logger';

export const fetcher = (input: RequestInfo, init?: RequestInit) => {
  return fetch(input, init).then(async (res) => {
    let payload;
    try {
      if (res.status === 204) return null; // 204 does not have body
      payload = await res.json();
    } catch (e) {
      Logger.err(e);
    }
    if (res.ok) {
      return payload;
    } else {
      return Promise.reject(payload.error || new Error('Something went wrong'));
    }
  });
};
