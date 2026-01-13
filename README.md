# 🔥 IoT Fire Detection Web App

Sistem deteksi kebakaran real-time dengan integrasi ESP32 dan geolokasi. Admin dapat melihat lokasi kebakaran di peta.

![Fire Detection](https://img.shields.io/badge/Status-Active-success)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18+-blue)

## 📋 Fitur Utama

- ✅ **Real-time Fire Alerts** - Notifikasi instan via WebSocket
- ✅ **Geolokasi Otomatis** - Lokasi user otomatis terkirim saat api terdeteksi
- ✅ **Peta Interaktif** - Admin dapat melihat lokasi kebakaran di peta (Leaflet)
- ✅ **Audio Alarm** - Alarm otomatis berbunyi saat FIRE dan mati saat SAFE
- ✅ **Multi-device Support** - Bisa diakses dari desktop dan mobile
- ✅ **Role-based Access** - Admin dan User dengan akses berbeda
- ✅ **Dark Theme UI** - Antarmuka modern dengan tema gelap

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Backend** | Node.js, Express.js, MySQL (Sequelize ORM), Socket.io, JWT |
| **Frontend** | React (Vite), Tailwind CSS, Socket.io-client, Leaflet.js |
| **Hardware** | ESP32, Flame Sensor, Buzzer |

## 📁 Struktur Folder

```
📦 fire-detection-app
├── 📂 backend
│   ├── 📂 config          # Database configuration
│   ├── 📂 controllers     # API logic (auth, sensor, log, user)
│   ├── 📂 middleware      # JWT authentication middleware
│   ├── 📂 models          # Sequelize models (User, SensorLog)
│   ├── 📂 routes          # API routes
│   └── 📄 server.js       # Main server file
└── 📂 frontend
    └── 📂 src
        ├── 📂 components  # Reusable components (Navbar, FireMap, etc)
        ├── 📂 pages       # Page components (Login, Dashboard)
        └── 📂 services    # API service (axios)
```

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- XAMPP/MySQL running on localhost:3306
- Create database: `fire_detection_db`

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 2. Konfigurasi Environment

Edit file `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=fire_detection_db
JWT_SECRET=fire_detection_super_secret_key_2024
PORT=5000
```

### 3. Jalankan Aplikasi

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 4. Akses Aplikasi

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## 👤 Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@fire.com | admin123 |

> 💡 Register untuk membuat akun user baru

## 🔌 ESP32 Integration

### Wiring Diagram

| ESP32 Pin | Component |
|-----------|-----------|
| GPIO 18 | Flame Sensor (OUT) |
| GPIO 19 | Buzzer (+) |
| GND | Common Ground |

### Arduino Code

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

#define FLAME_PIN 18
#define BUZZER_PIN 19

const char* ssid = "NAMA_WIFI";
const char* password = "PASSWORD_WIFI";

// Ganti dengan IP komputer Anda
const char* serverUrl = "http://192.168.0.101:5000/api/sensor/update";

int lastStatus = -1;

void setup() {
  pinMode(FLAME_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  Serial.begin(115200);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" Connected!");
}

void sendStatusToServer(int isFire) {
  if(WiFi.status() == WL_CONNECTED){
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    String statusStr = (isFire == LOW) ? "FIRE" : "SAFE";
    String requestBody = "{\"status\":\"" + statusStr + "\"}";

    int httpResponseCode = http.POST(requestBody);
    Serial.println(httpResponseCode);
    http.end();
  }
}

void loop() {
  int flameStatus = digitalRead(FLAME_PIN);

  if (flameStatus == LOW) {
    digitalWrite(BUZZER_PIN, HIGH);
  } else {
    digitalWrite(BUZZER_PIN, LOW);
  }

  if (flameStatus != lastStatus) {
    sendStatusToServer(flameStatus);
    lastStatus = flameStatus;
  }

  delay(100);
}
```

### Testing tanpa ESP32

```bash
# Simulasi FIRE
curl -X POST http://localhost:5000/api/sensor/update \
  -H "Content-Type: application/json" \
  -d '{"status":"FIRE"}'

# Simulasi SAFE
curl -X POST http://localhost:5000/api/sensor/update \
  -H "Content-Type: application/json" \
  -d '{"status":"SAFE"}'
```

## 📱 Akses dari Mobile

### Setup

1. Pastikan HP dan komputer terhubung ke **WiFi yang sama**
2. Cek IP komputer dengan `ipconfig` (Windows) atau `ifconfig` (Mac/Linux)
3. Buka firewall port 5000 dan 5173:
   ```powershell
   # Windows (Run as Administrator)
   netsh advfirewall firewall add rule name="Node Backend" dir=in action=allow protocol=TCP localport=5000
   netsh advfirewall firewall add rule name="Vite Frontend" dir=in action=allow protocol=TCP localport=5173
   ```
4. Akses dari HP: `http://[IP_KOMPUTER]:5173`

### ⚠️ Geolocation di Mobile

Geolocation API memerlukan **HTTPS** di mobile browser. Untuk development, gunakan salah satu opsi:

**Opsi 1: ngrok (HTTPS tunnel)**
```bash
ngrok http 5173
# Gunakan URL https yang diberikan
```

**Opsi 2: Chrome Flags (Android)**
1. Buka `chrome://flags` di Chrome Android
2. Cari "Insecure origins treated as secure"
3. Tambahkan `http://192.168.0.101:5173`
4. Enable dan restart Chrome

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user baru |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/profile` | Get profile (auth required) |

### Sensor
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sensor/update` | Update status dari ESP32 |
| POST | `/api/sensor/location` | Update lokasi user |
| GET | `/api/sensor/status` | Get current status |
| GET | `/api/sensor/fire-locations` | Get fire locations (admin) |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/logs` | Get all sensor logs |
| GET | `/api/users` | Get all users |

## 🗃️ Database Schema

### users
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| username | VARCHAR(100) | Username |
| email | VARCHAR(100) | Email (unique) |
| password | VARCHAR(255) | Hashed password |
| role | ENUM | 'admin' or 'user' |
| createdAt | DATETIME | Created timestamp |

### sensor_logs
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| status | VARCHAR(50) | 'FIRE' or 'SAFE' |
| latitude | FLOAT | GPS latitude |
| longitude | FLOAT | GPS longitude |
| address | VARCHAR(255) | Optional address |
| userId | INT | User who detected fire |
| username | VARCHAR(100) | Username |
| createdAt | DATETIME | Event timestamp |

## 🔒 Security Notes

- JWT tokens expire in 24 hours
- Passwords are hashed with bcrypt (10 rounds)
- CORS is configured for development (allow all origins)
- For production, configure specific CORS origins

## 📝 License

MIT License - Free to use for educational purposes.

---

**Developed for IoT Fire Detection Final Project** 🔥
