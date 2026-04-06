import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'redbrick-backend' });
});

// TODO: Mount route modules
// app.use('/api/auth', authRoutes);
// app.use('/api/loans', loanRoutes);
// app.use('/api/payments', paymentRoutes);
// app.use('/api/meters', meterRoutes);

app.listen(PORT, () => {
  console.log(`RedBrick API running on port ${PORT}`);
});

export default app;
