# SIH Environmental Monitoring

This is the central application repository for our SIH26178 project, Environmental Monitoring. It acts as the Command Center dashboard and the backend API for hardware sensor nodes (ESP32).

## Tech Stack
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Turso (libSQL)
- **Deployment**: Vercel (planned)

## Project Structure
\`\`\`text
src/
├── app/
│   ├── api/
│   │   └── sensors/           # Hardware API integration endpoints
│   ├── nodes/
│   │   └── [nodeId]/          # Individual node details page
│   ├── globals.css            # Global Tailwind styles
│   ├── layout.tsx             # Root app layout
│   └── page.tsx               # Main Command Center Dashboard
├── lib/
│   ├── db.ts                  # Turso database connection & init script
│   └── mock-data.ts           # Sample data for UI prototyping
├── services/
│   └── api.ts                 # Service layer wrapping backend fetches
└── types/
    └── index.ts               # Shared TypeScript interfaces (SensorPayload, etc)
\`\`\`

## Local Setup

1. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Environment Variables**
   Copy `.env.example` to `.env.local` and configure your keys.
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`
   Set \`NEXT_PUBLIC_USE_MOCK_DATA=true\` to use local mock data without a DB connection.

3. **Run Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`
   Access the dashboard at http://localhost:3000

## Turso / Database Setup

We use Turso as our serverless SQLite edge database.
To set up:
1. Create a database on Turso: \`turso db create sih-sensors\`
2. Get the DB URL: \`turso db show sih-sensors\`
3. Create an Auth token: \`turso db tokens create sih-sensors\`
4. Update your \`.env.local\` with \`TURSO_DATABASE_URL\` and \`TURSO_AUTH_TOKEN\`.
5. The schema handles its own initialization on first request via \`src/lib/db.ts\` for local testing.

## Hardware Integration

The hardware team (ESP32) is responsible for reading analog/digital signals and posting JSON payloads.

**Local Testing URL for Hardware Team:**
\`\`\`
POST http://<YOUR_LOCAL_IP>:3000/api/sensors
\`\`\`

### Expected Payload Structure
\`\`\`json
{
  "waterDistance": 11.82,
  "rainSensor": 4095,
  "rainGaugeTips": 81,
  "soilMoisture": 4095,
  "temperature": 28.00,
  "humidity": 72.00
}
\`\`\`

*Note: The hardware payload uses raw calibration values. The backend stores these directly without assumptions (e.g., \`waterDistance\` remains a distance, not converted to \`waterLevel\` yet).*

## API Endpoints

### 1. Ingest Sensor Reading
- **Method:** \`POST\`
- **Endpoint:** \`/api/sensors\`
- **Description:** Receives hardware payload and stores it in Turso.
- **Example:**
  \`\`\`bash
  curl -X POST http://localhost:3000/api/sensors \\
    -H "Content-Type: application/json" \\
    -d '{"waterDistance": 15.0, "rainSensor": 2000, "rainGaugeTips": 2, "soilMoisture": 1000, "temperature": 25.5, "humidity": 60}'
  \`\`\`

### 2. Get Latest Readings (All Nodes)
- **Method:** \`GET\`
- **Endpoint:** \`/api/sensors/latest\`
- **Description:** Returns the most recent reading for each active node.

### 3. Get Node History
- **Method:** \`GET\`
- **Endpoint:** \`/api/sensors/[nodeId]?limit=10\`
- **Description:** Returns metadata and recent readings for a specific node.

## Mock Data

During initial development, the frontend leverages \`src/lib/mock-data.ts\` which contains realistic sensor deployments (active, warning, critical states) to visualize the dashboard without needing hardware plugged in. Toggle \`NEXT_PUBLIC_USE_MOCK_DATA=true\` in your environment to use it.
