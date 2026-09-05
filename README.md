# Sentinel: Environmental Early Warning & Intelligence Platform

Sentinel is a real-time environmental monitoring, telemetry ingestion, and risk intelligence platform built for early hazard detection and water resource safety.

---

## 1. Intelligence Architecture

Sentinel implements a multi-layer server-side intelligence architecture that bridges raw sensor data and operational decision support:

```
[ ESP32 Sensor Nodes ]
          │
          ▼  (POST /api/sensors)
┌──────────────────────────────────────────────────────────┐
│  Layer 1: Telemetry Ingestion & Normalization            │
│  - Device auth via X-API-Key                             │
│  - Node identity resolution (JSON / Header / Dev Default)│
│  - Rejection of non-finite/malformed payloads            │
└─────────────────────────┬────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 2: Feature Engineering & Time-Series Analytics    │
│  - Rate-of-change calculation (Δwater/min, Δtips/min)    │
│  - Rolling averages & sample window aggregation          │
│  - Reading age & data freshness tracking                 │
└─────────────────────────┬────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 3: Deterministic Data-Quality & Safety Engine     │
│  - Non-finite & out-of-bounds detection                  │
│  - Future timestamp & stale data validation              │
│  - Frozen sensor detection (stuck ADC values)            │
│  - Suspicious jump detection                             │
└─────────────────────────┬────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 4: Calibration & Geometry Translation             │
│  - Mount height & reference distance translation         │
│  - Explicit CALIBRATION_REQUIRED flagging if unconfigured│
└─────────────────────────┬────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 5: Configurable Hazard Rules                      │
│  - Active hardware fault & surge rate rules              │
│  - Explicitly disabled flood rules pending survey data   │
└─────────────────────────┬────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 6: Edge AI / ML Provider Abstraction              │
│  - Edge Impulse integration contract                     │
│  - Default MODEL_UNAVAILABLE state (no fabricated score) │
└─────────────────────────┬────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 7: Risk Fusion & Assessment Engine                │
│  - Fuses data quality, rules, model inference, anomalies │
│  - Explicit precedence (Safety rules > Model > Baseline) │
└─────────────────────────┬────────────────────────────────┘
                          ▼
    [ Command Center Dashboard & GET /api/risk ]
```

---

## 2. RAW vs DERIVED vs CALIBRATED Data Tiers

To maintain strict scientific honesty and avoid fabricated hazard alerts, Sentinel strictly categorizes all telemetry into three distinct tiers:

| Data Tier | Description | Examples |
| :--- | :--- | :--- |
| **RAW** | Unmodified ADC values or direct transducer signals transmitted by the hardware. | `water_distance_cm` (53.78 cm), `rain_sensor_raw` (4095 ADC), `soil_moisture_raw` (4095 ADC), `rain_gauge_tips` (0) |
| **DERIVED** | Mathematically valid time-series features calculated over historical sample windows without physical conversion assumptions. | `waterDistanceRatePerMin` (-2.0 cm/min), `rainTipRatePerMin` (3.0 tips/min), `rollingAverages`, `readingAgeSeconds` |
| **CALIBRATED** | Physical engineering units derived only when site-specific structural geometry and calibration endpoints are provided. | `waterLevelCm` (mount height - distance), `rainfallMm` (tips × tip_volume), `soilMoisturePct` (%) |

> [!IMPORTANT]
> When physical calibration metadata is absent, `calibratedValues` return `null` and the system marks the node state as **`CALIBRATION_REQUIRED`**. Sentinel **never** assumes arbitrary mount heights or invents flood stages.

---

## 3. Risk Fusion Precedence

The Risk Fusion Engine (`src/lib/risk-engine.ts`) aggregates multi-layer signals according to strict operational precedence:

1. **Deterministic Safety Rules**: Emergency or critical safety rules (e.g. physical sensor fault, impossible jump) override less severe ML predictions.
2. **Edge AI Model Inference**: Active Edge Impulse model output is incorporated when available and validated.
3. **Data Quality Failures**: Data staleness (>300s) or out-of-bounds readings force `SENSOR_DATA_STALE` or `INSUFFICIENT_DATA`.
4. **Honest Baseline Fallback**: If no trained ML model and no physical calibration exists, `riskLevel` defaults to `UNKNOWN` or `NORMAL`, with `riskScore` and `confidence` strictly set to `null`.

---

## 4. API Endpoints

### Ingestion & Telemetry
- `POST /api/sensors`: Ingests hardware telemetry. Supports `node_id` in JSON or `X-Node-ID` header, and `X-API-Key` auth.
- `GET /api/sensors/latest`: Returns latest readings for all active nodes.
- `GET /api/sensors/[nodeId]`: Returns historical readings for a specific node (`?limit=20`).

### Alerts & Lifecycle
- `GET /api/alerts`: Retrieves system alerts (`?resolved=false&severity=critical`).
- `PATCH /api/alerts/[id]`: Updates alert status (`status: "ACKNOWLEDGED" | "RESOLVED" | "OPEN"`).

### Risk & Intelligence
- `GET /api/risk`: Returns comprehensive `RiskAssessment` objects for all deployed nodes.
- `GET /api/risk/[nodeId]`: Returns detailed `RiskAssessment` including derived features, data quality report, calibration status, and model inference for a specific node.

---

## 5. Running Tests

Run the automated unit and intelligence test suite:
```bash
npx tsx test-intelligence.ts
```

Run TypeScript and production build checks:
```bash
npx tsc --noEmit
npm run build
```

---

## 6. Current Limitations & Future Edge Impulse Integration
- **Edge AI Model**: The `EdgeImpulseProvider` interface is ready for WebAssembly/C++ inference integration once the model is trained by the hardware team. Currently reports `MODEL_UNAVAILABLE`.
- **Flood Thresholds**: Physical inundation rules remain disabled until river cross-section profiles and sensor mount heights are calibrated per station.
- **Authentication**: Shared symmetric API key mechanism (`SENSOR_INGESTION_API_KEY`). Per-device asymmetric key signing will be introduced in future revisions.
