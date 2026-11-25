#!/bin/sh
# Chay tu thu muc goc repo: sh implement/audio-split/cut_numbers.sh
set -e
mkdir -p implement/webapp/public/audio/v1
ffmpeg -nostdin -v error -y -ss 177 -to 192 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/01.mp3  # 2:57.0-3:12.0 
ffmpeg -nostdin -v error -y -ss 192 -to 217 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/02.mp3  # 3:12.0-3:37.0 
ffmpeg -nostdin -v error -y -ss 217 -to 240 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/03.mp3  # 3:37.0-4:00.0 
ffmpeg -nostdin -v error -y -ss 240 -to 265 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/04.mp3  # 4:00.0-4:25.0 
ffmpeg -nostdin -v error -y -ss 265 -to 303 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/05.mp3  # 4:25.0-5:03.0 
ffmpeg -nostdin -v error -y -ss 303 -to 320 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/06.mp3  # 5:03.0-5:20.0 
ffmpeg -nostdin -v error -y -ss 320 -to 342.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/07.mp3  # 5:20.0-5:42.5 
ffmpeg -nostdin -v error -y -ss 342.5 -to 368 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/08.mp3  # 5:42.5-6:08.0 
ffmpeg -nostdin -v error -y -ss 368 -to 392 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/09.mp3  # 6:08.0-6:32.0 
ffmpeg -nostdin -v error -y -ss 392 -to 414 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/10.mp3  # 6:32.0-6:54.0 
ffmpeg -nostdin -v error -y -ss 414 -to 445.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/11.mp3  # 6:54.0-7:25.5 
ffmpeg -nostdin -v error -y -ss 445.5 -to 472 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/12.mp3  # 7:25.5-7:52.0 
ffmpeg -nostdin -v error -y -ss 472 -to 502 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/13.mp3  # 7:52.0-8:22.0 
ffmpeg -nostdin -v error -y -ss 502 -to 527 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/14.mp3  # 8:22.0-8:47.0 
ffmpeg -nostdin -v error -y -ss 527 -to 562 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/15.mp3  # 8:47.0-9:22.0 
ffmpeg -nostdin -v error -y -ss 562 -to 592.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/16.mp3  # 9:22.0-9:52.5 
ffmpeg -nostdin -v error -y -ss 592.5 -to 631.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/17.mp3  # 9:52.5-10:31.5 
ffmpeg -nostdin -v error -y -ss 631.5 -to 661.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/18.mp3  # 10:31.5-11:01.5 
ffmpeg -nostdin -v error -y -ss 661.5 -to 677 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/19.mp3  # 11:01.5-11:17.0 
ffmpeg -nostdin -v error -y -ss 677 -to 710 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/20.mp3  # 11:17.0-11:50.0 
ffmpeg -nostdin -v error -y -ss 710 -to 722 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/21.mp3  # 11:50.0-12:02.0 
ffmpeg -nostdin -v error -y -ss 722 -to 757 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/22.mp3  # 12:02.0-12:37.0 
ffmpeg -nostdin -v error -y -ss 757 -to 785.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/23.mp3  # 12:37.0-13:05.5 
ffmpeg -nostdin -v error -y -ss 785.5 -to 825.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/24.mp3  # 13:05.5-13:45.5 
ffmpeg -nostdin -v error -y -ss 825.5 -to 885.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/25.mp3  # 13:45.5-14:45.5 
ffmpeg -nostdin -v error -y -ss 885.5 -to 905 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/26.mp3  # 14:45.5-15:05.0 
ffmpeg -nostdin -v error -y -ss 905 -to 927 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/27.mp3  # 15:05.0-15:27.0 
ffmpeg -nostdin -v error -y -ss 927 -to 955 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/28.mp3  # 15:27.0-15:55.0 
ffmpeg -nostdin -v error -y -ss 955 -to 980 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/29.mp3  # 15:55.0-16:20.0 
ffmpeg -nostdin -v error -y -ss 980 -to 1001 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/30.mp3  # 16:20.0-16:41.0 
ffmpeg -nostdin -v error -y -ss 1001 -to 1059 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/31.mp3  # 16:41.0-17:39.0 
ffmpeg -nostdin -v error -y -ss 1059 -to 1075 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/32.mp3  # 17:39.0-17:55.0 
ffmpeg -nostdin -v error -y -ss 1075 -to 1108.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/33.mp3  # 17:55.0-18:28.5 
ffmpeg -nostdin -v error -y -ss 1108.5 -to 1141 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/34.mp3  # 18:28.5-19:01.0 
ffmpeg -nostdin -v error -y -ss 1141 -to 1165 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/35.mp3  # 19:01.0-19:25.0 
ffmpeg -nostdin -v error -y -ss 1165 -to 1183 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/36.mp3  # 19:25.0-19:43.0 
ffmpeg -nostdin -v error -y -ss 1183 -to 1243.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/37.mp3  # 19:43.0-20:43.5 
ffmpeg -nostdin -v error -y -ss 1243.5 -to 1281 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/38.mp3  # 20:43.5-21:21.0 
ffmpeg -nostdin -v error -y -ss 1281 -to 1315 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/39.mp3  # 21:21.0-21:55.0 
ffmpeg -nostdin -v error -y -ss 1315 -to 1353 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/40.mp3  # 21:55.0-22:33.0 
ffmpeg -nostdin -v error -y -ss 1353 -to 1393 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/41.mp3  # 22:33.0-23:13.0 
ffmpeg -nostdin -v error -y -ss 1393 -to 1431.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/42.mp3  # 23:13.0-23:51.5 
ffmpeg -nostdin -v error -y -ss 1431.5 -to 1457 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/43.mp3  # 23:51.5-24:17.0 
ffmpeg -nostdin -v error -y -ss 1457 -to 1494.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/44.mp3  # 24:17.0-24:54.5 
ffmpeg -nostdin -v error -y -ss 1494.5 -to 1536.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/45.mp3  # 24:54.5-25:36.5 
ffmpeg -nostdin -v error -y -ss 1536.5 -to 1563 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/46.mp3  # 25:36.5-26:03.0 
ffmpeg -nostdin -v error -y -ss 1563 -to 1613.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/47.mp3  # 26:03.0-26:53.5 
ffmpeg -nostdin -v error -y -ss 1613.5 -to 1651 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/48.mp3  # 26:53.5-27:31.0 
ffmpeg -nostdin -v error -y -ss 1651 -to 1703.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/49.mp3  # 27:31.0-28:23.5 
ffmpeg -nostdin -v error -y -ss 1703.5 -to 1742.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/50.mp3  # 28:23.5-29:02.5 
ffmpeg -nostdin -v error -y -ss 1742.5 -to 1802 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/51.mp3  # 29:02.5-30:02.0 
ffmpeg -nostdin -v error -y -ss 1802 -to 1822 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/52.mp3  # 30:02.0-30:22.0 
ffmpeg -nostdin -v error -y -ss 1822 -to 1870 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/53.mp3  # 30:22.0-31:10.0 
ffmpeg -nostdin -v error -y -ss 1870 -to 1908 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/54.mp3  # 31:10.0-31:48.0 ?
ffmpeg -nostdin -v error -y -ss 1908 -to 1965 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/55.mp3  # 31:48.0-32:45.0 ?
ffmpeg -nostdin -v error -y -ss 1965 -to 2010 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/56.mp3  # 32:45.0-33:30.0 ?
ffmpeg -nostdin -v error -y -ss 2010 -to 2057 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/57.mp3  # 33:30.0-34:17.0 
ffmpeg -nostdin -v error -y -ss 2057 -to 2092 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/58.mp3  # 34:17.0-34:52.0 
ffmpeg -nostdin -v error -y -ss 2092 -to 2123.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/59.mp3  # 34:52.0-35:23.5 
ffmpeg -nostdin -v error -y -ss 2123.5 -to 2188 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/60.mp3  # 35:23.5-36:28.0 
ffmpeg -nostdin -v error -y -ss 2188 -to 2232 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/61.mp3  # 36:28.0-37:12.0 
ffmpeg -nostdin -v error -y -ss 2232 -to 2271 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/62.mp3  # 37:12.0-37:51.0 
ffmpeg -nostdin -v error -y -ss 2271 -to 2325.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/63.mp3  # 37:51.0-38:45.5 
ffmpeg -nostdin -v error -y -ss 2325.5 -to 2354.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/64.mp3  # 38:45.5-39:14.5 
ffmpeg -nostdin -v error -y -ss 2354.5 -to 2385.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/65.mp3  # 39:14.5-39:45.5 
ffmpeg -nostdin -v error -y -ss 2385.5 -to 2413.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/66.mp3  # 39:45.5-40:13.5 
ffmpeg -nostdin -v error -y -ss 2413.5 -to 2503 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/67.mp3  # 40:13.5-41:43.0 
ffmpeg -nostdin -v error -y -ss 2503 -to 2529 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/68.mp3  # 41:43.0-42:09.0 ?
ffmpeg -nostdin -v error -y -ss 2529 -to 2532 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/69.mp3  # 42:09.0-42:12.0 ?
ffmpeg -nostdin -v error -y -ss 2532 -to 2577 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/70.mp3  # 42:12.0-42:57.0 ?
ffmpeg -nostdin -v error -y -ss 2577 -to 2596.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/71.mp3  # 42:57.0-43:16.5 
ffmpeg -nostdin -v error -y -ss 2596.5 -to 2643.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/72.mp3  # 43:16.5-44:03.5 
ffmpeg -nostdin -v error -y -ss 2643.5 -to 2678 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/73.mp3  # 44:03.5-44:38.0 
ffmpeg -nostdin -v error -y -ss 2678 -to 2709 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/74.mp3  # 44:38.0-45:09.0 
ffmpeg -nostdin -v error -y -ss 2709 -to 2731.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/75.mp3  # 45:09.0-45:31.5 
ffmpeg -nostdin -v error -y -ss 2731.5 -to 2764.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/76.mp3  # 45:31.5-46:04.5 
ffmpeg -nostdin -v error -y -ss 2764.5 -to 2780.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/77.mp3  # 46:04.5-46:20.5 
ffmpeg -nostdin -v error -y -ss 2780.5 -to 2808.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/78.mp3  # 46:20.5-46:48.5 ?
ffmpeg -nostdin -v error -y -ss 2808.5 -to 2834 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/79.mp3  # 46:48.5-47:14.0 
ffmpeg -nostdin -v error -y -ss 2834 -to 2886.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/80.mp3  # 47:14.0-48:06.5 ?
ffmpeg -nostdin -v error -y -ss 2886.5 -to 2910 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/81.mp3  # 48:06.5-48:30.0 ?
ffmpeg -nostdin -v error -y -ss 2910 -to 2959 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/82.mp3  # 48:30.0-49:19.0 ?
ffmpeg -nostdin -v error -y -ss 2959 -to 2983 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/83.mp3  # 49:19.0-49:43.0 
ffmpeg -nostdin -v error -y -ss 2983 -to 3028 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/84.mp3  # 49:43.0-50:28.0 
ffmpeg -nostdin -v error -y -ss 3028 -to 3067.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/85.mp3  # 50:28.0-51:07.5 
ffmpeg -nostdin -v error -y -ss 3067.5 -to 3108 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/86.mp3  # 51:07.5-51:48.0 
ffmpeg -nostdin -v error -y -ss 3108 -to 3168 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/87.mp3  # 51:48.0-52:48.0 
ffmpeg -nostdin -v error -y -ss 3168 -to 3221 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/88.mp3  # 52:48.0-53:41.0 
ffmpeg -nostdin -v error -y -ss 3221 -to 3264.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/89.mp3  # 53:41.0-54:24.5 
ffmpeg -nostdin -v error -y -ss 3264.5 -to 3313.5 -i implement/webapp/public/audio/audio.mp3 -c:a libmp3lame -q:a 4 implement/webapp/public/audio/v1/90.mp3  # 54:24.5-55:13.5 
