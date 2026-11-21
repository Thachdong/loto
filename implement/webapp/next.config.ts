import type { NextConfig } from "next";

// `htmlLimitedBots` ghi đè danh sách mặc định của Next (HTML_LIMITED_BOT_UA_RE) nên chép lại rồi thêm
// các crawler xem trước link của Zalo / Telegram / Viber / Line để nhận thẻ <meta og:*> trong <head> (SUP-06).
const DEFAULT_HTML_LIMITED_BOTS =
  /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight/;

const nextConfig: NextConfig = {
  htmlLimitedBots: new RegExp(`${DEFAULT_HTML_LIMITED_BOTS.source}|Zalo|TelegramBot|Viber|Line`, "i"),
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
