import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createDatabase } from './db';
import { createApp, cleanupExpiredData } from './app';

const db = await createDatabase();
const app = createApp({ db });
const production = process.env.NODE_ENV === 'production';
if (production) {
  const clientDir = path.resolve('dist/client');
  app.use(
    express.static(clientDir, {
      index: false,
      maxAge: '1h',
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`))
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    }),
  );
  app.get('/{*path}', (_req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(clientDir, 'index.html'));
  });
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, process.env.HOST || '0.0.0.0', () =>
  console.log(`Remainder is ready at http://localhost:${port}`),
);
server.requestTimeout = 120_000;
server.headersTimeout = 30_000;
server.keepAliveTimeout = 5_000;
await cleanupExpiredData(db);
const cleanupTimer = setInterval(() => {
  void cleanupExpiredData(db).catch(() =>
    console.error('Scheduled data cleanup failed; it will retry.'),
  );
}, 60 * 60_000);
cleanupTimer.unref();
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  clearInterval(cleanupTimer);
  server.close(() => {
    void db.close().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 15_000).unref();
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
