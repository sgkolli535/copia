import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { aiRoutes } from './routes/ai.js';

const app = express();
const port = process.env.PORT ?? 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use('/api', aiRoutes);

app.listen(port, () => {
  console.log(`@copia/server listening on http://localhost:${port}`);
});
