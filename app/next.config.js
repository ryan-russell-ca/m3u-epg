module.exports = {
  reactStrictMode: true,
  swcMinify: false,
  env: {
    COUNTRY_WHITELIST: '["ca", "us", "uk", "unpopulated"]',
    MONGO_DB_CONNECTION_STRING: 'mongodb://iptv-app-mongo:27017/iptv',
    // ## Setup jet-logger ##
    JET_LOGGER_MODE: 'CONSOLE',
    JET_LOGGER_FILEPATH: 'jet-logger.log',
    JET_LOGGER_TIMESTAMP: 'TRUE',
    JET_LOGGER_FORMAT: 'LINE',

    // # External Files / URLs
    M3U_FILENAME: './data/mapping/default.@/types/m3u',
    M3U_URL: 'https://speed.cd/tv/193662/eOBycPCXjM/Default',
    CODES_JSON_URL: 'https://iptv-org.github.io/epg/codes.json',
    CONFIRMED_MAPPINGS_FILE: './data/mapping/confirmed.json',
    CUSTOM_XMLTV_MAPPINGS_FILE: './data/mapping/custom.epg.json',

    // # Timing
    XMLTV_TIME_AHEAD_SECONDS: 86400,
    XMLTV_TIME_BEHIND_SECONDS: 3600001,
    CODES_EXPIRATION_SECONDS: 259200,
    XMLTV_EXPIRATION_SECONDS: 86400,
    M3U_EXPIRATION_SECONDS: 259200,
  },
  images: {
    domains: [
      'cdn.tvpassport.com',
      'zap2it.tmsimg.com',
      'inet-static.mw.elion.ee',
      'content.osn.com',
      'www.ipko.com',
      'cdn.mitvstatic.com',
      'imagenes.gatotv.com',
      'www.directv.com',
      'otv-us-web.s3-us-west-2.amazonaws.com',
      'www.sms.cz',
      'fanc.tmsimg.com',
      'www.mncvision.id',
      'mts.rs',
      'ottepg6.nexttv.ht.hr',
      'images.ctfassets.net',
      'thenewsforum.ca',
      'programacion-tv.elpais.com',
      'www.vivacom.bg',
      'www.pngkit.com',
      'www.zap.co.ao',
      'cdn-0.tvprofil.com',
      'content.sportslogos.net',
      'static.epg.best',
      'rndcdn.dstv.com',
      'i.imgur.com',
      'bellotelo.com',
      's3.i3ns.net',
      'mtel.ba',
      'ottepg1.nexttv.ht.hr',
      'ocdn.eu',
      'avatars.mds.yandex.net',
      'www.magticom.ge',
      'imagesdishtvd2h.whatsonindia.com',
      'static.cinemagia.ro',
      'live-delta.ottnow.stoneroos.com',
      'www.cosmote.gr',
      'assets.lamuscle.com',
      'comteco.com.bo',
      'dmxg5wxfqgb4u.cloudfront.net',
      'www.world.rugby',
      'cdn.hd-plus.de',
      'divign0fdw3sv.cloudfront.net',
      'www.programme-tv.net',
      'cdn-std-1.sibasa.netdna-cdn.com',
      'bronx.news12.com',
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback.fs = false;
    }
    config.resolve.symlinks = false;
    return config;
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/iptv',
        permanent: true,
      },
    ];
  },
};
