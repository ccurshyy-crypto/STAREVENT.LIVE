import { createApiApp } from '../server.ts';

// Disable Vercel's default body parser so Express handles JSON and Cashfree raw webhook bytes directly
export const config = {
  api: {
    bodyParser: false,
  },
};

const app = createApiApp();

export default app;
