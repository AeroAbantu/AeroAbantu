import { app, ensureBootstrapped } from './app';
import './env';

const PORT = Number(process.env.PORT || 3001);

async function start() {
  await ensureBootstrapped();
  app.listen(PORT, () => {
    console.log(`AeroBantu backend listening on http://localhost:${PORT}`);
  });
}

start().catch((e) => {
  console.error('SERVER_START_FAILED', e);
  process.exit(1);
});
