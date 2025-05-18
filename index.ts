import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';

interface SensorData {
  weight: number;
  percentage: number;
  battery: number;
  status: string;
  batteryStatus: string;
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let latestData: SensorData = {
  weight: 0,
  percentage: 0,
  battery: 0,
  status: 'Normal', 
  batteryStatus: 'Normal',
};

const computeStatus = (percentage: number): string => {
  return percentage < 15 ? 'Critical' : percentage < 30 ? 'Low' : 'Normal';
}

wss.on('connection', (ws: WebSocket) => {
  console.log('Frontend connected via WebSocket');

  ws.send(JSON.stringify(latestData));

  // Optional simulation interval
  const interval = setInterval(() => {
    ws.send(JSON.stringify(latestData));
  }, 5000);

  ws.on('close', () => clearInterval(interval));
});

const updateHandler: express.RequestHandler = (req, res) => {
    const { weight, percentage, battery } = req.body;

  if (
    typeof weight !== 'number' ||
    typeof percentage !== 'number' ||
    typeof battery !== 'number'
  ) {
    return res.status(400).json({ error: 'Invalid sensor data format' });
  }

  latestData = {
    weight,
    percentage,
    battery,
    status: computeStatus(percentage),
    batteryStatus: computeStatus(battery),
  };

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(latestData));
      console.log("Broadcasting:", latestData)
    }
  });

  res.json({ success: true });
};

app.post('/', updateHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
