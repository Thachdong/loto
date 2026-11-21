# Lô Tô Online — webapp

Next.js 16 (App Router) + Firebase. Kiến trúc: `.claude/skills/implement-task/references/architecture.md`. Stack: `specs/tech-stack.md`.

## Yêu cầu
- Node.js 22 LTS
- Java 17+ (Firebase Emulator Suite)
- `firebase-tools` đã nằm trong devDependencies (`npx firebase …`), không cần cài global

## Cài đặt
```bash
npm install
npm --prefix functions install
cp .env.example .env.local    # giá trị mặc định dành cho emulator project demo-loto
```

## Chạy local
```bash
npm run emulators   # Emulator Suite: Auth 9099, Firestore 8080, RTDB 9000, Storage 9199, Functions 5001, UI http://localhost:4000
npm run dev         # http://localhost:3000
npm run seed -- smoke    # ghi doc _smoke/hello; `reset` xoá sạch dữ liệu emulator
```
Dữ liệu emulator được giữ trong `.emulator-data/` (gitignore) giữa các lần chạy.

## Kiểm tra
```bash
npm run typecheck
npm run lint        # gồm ranh giới lớp (eslint-plugin-boundaries)
npm run test:unit   # Vitest project unit, không cần emulator
npm test            # mọi test, tự bật emulator qua `firebase emulators:exec`
npm run build
```

## Ghi chú
- Test trên Chrome do AI chạy: `docs/chrome-testing.md`.
- Chỉ cài package bằng `npm ci`, hoặc `npm install` khi đã xoá `node_modules` và `package-lock.json`. Cài lẻ một package (`npm install <pkg>`, CLI của shadcn) có thể làm lockfile mất native binding của rolldown (npm/cli#4828), khiến Vitest không chạy được.
