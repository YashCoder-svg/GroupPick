# GroupPick — Universal Group-Decision Platform

> **End group chat paralysis. One link. 30-second preferences. 3 explained options the whole group can genuinely accept.**

GroupPick is a full-stack, production-quality group decision platform built with the **MERN stack** (MongoDB, Express, React, Node.js). It replaces biased or naive group voting with social choice theory, multi-criteria Pareto optimization, private budget guarantees, persistent fairness weighting, and universal destination intelligence for **any place in India**.

---

## 🌟 Key Differentiators

1. **Any Destination in India (Metros to Hill Stations)**:
   - Search-as-you-type destination input powered by the **Photon Geocoder** (OSM-based, free, no key needed) restricted to India (`bbox=68.1,6.7,97.4,37.1`), debounced at 300ms with in-flight request cancellation.
   - Quick-select **"Popular in India"** chips: *Goa, Jaipur, Manali, Delhi, Mumbai, Bengaluru, Rishikesh, Udaipur*.
   - Works for metros, small towns, and hill stations (Pushkar, Mount Abu, Hampi, Kochi, etc.).
2. **Places Intelligence via Overpass API & MongoDB 2dsphere Caching**:
   - Queries OpenStreetMap via Overpass API within a 5 km radius (expandable to 15 km).
   - Serialized queue with exponential backoff and endpoint rotation across multiple public mirrors.
   - Cached in MongoDB with a **2dsphere geospatial index and a 7-day TTL**. Repeated searches for the same area are served from cache.
   - Built-in offline fallback dataset for 10 major Indian cities (Delhi, Mumbai, Bengaluru, Hyderabad, Chennai, Kolkata, Jaipur, Goa, Udaipur, Manali).
3. **Honest INR (₹) Pricing & Community Price Reports**:
   - OpenStreetMap does not have actual prices, so GroupPick is completely honest in the UI: estimates are shown as realistic ranges (e.g. *"about Rs 200-400"*) with an `estimated` tag.
   - **Report Actual Price**: Members can report actual spend per person. Once 3+ reports exist, the median reported price replaces the estimate.
4. **Private Budgets (Zero-Leakage Guarantee)**:
   - Each member inputs their private budget ceiling in INR confidentially.
   - The API **never** leaks individual member budgets to peers or organizers.
   - The group only sees an aggregate feasible ceiling ($B_{\text{ceiling}} = \min_i B_i$), never who set it.
5. **The Fairness Ledger**:
   - Persisted per group in MongoDB.
   - Tracks how often each member's top choice won or compromised.
   - Members who compromised in past decisions receive an elevated weight ($0.80\text{x}$ to $1.30\text{x}$) in subsequent decisions.
6. **Hard Limits vs. Soft Wishes**:
   - **Hard limits** (pure veg, vegan, halal, wheelchair access, budget caps) strictly filter out incompatible options.
   - **Soft wishes** (dhabas, street food, rooftop, craft beer, quiet) contribute to satisfaction scores without disqualifying.
7. **Three Explained Options, Not One Answer**:
   - **"Best Overall"**: Maximizes aggregate total group happiness.
   - **"Fairest to Everyone"**: Maximizes the satisfaction of the least-happy member (Rawlsian Maximin).
   - **"Most Budget-Friendly"**: Best value under the group budget ceiling.
   - Each has a plain-language *"Why this?"* explanation and per-member satisfaction rings.

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client[React + Vite Frontend<br/>Tailwind CSS & Framer Motion]
    LeafletMap[Leaflet Map<br/>OpenStreetMap Free Tiles]
    Photon[Photon Geocoder<br/>India Bounding Box Autocomplete]
    Overpass[Overpass API<br/>Serialized Queue & Retries]
    
    subgraph Express Backend
        API[Express 4 REST API]
        DestService[Destinations Service<br/>Photon Proxy & Rate Limiter]
        PlacesService[Places Service<br/>2dsphere Cache & Normalizer]
        SocketServer[Socket.io Real-Time Lobby]
        Swagger[Swagger UI Docs<br/>/api/docs]
    end
    
    subgraph Decision Engine /server/src/engine
        Candidates[Candidate Generator]
        HardFilter[Hard-Constraint Filter]
        SatMatrix[Satisfaction Matrix 0-100]
        Fairness[Fairness Ledger Weighting]
        SocialChoice[Social Welfare Aggregation]
        ParetoFrontier[Pareto Frontier & 3 Archetypes]
        TSPRouter[Time-Window TSP Router]
    end
    
    subgraph Database
        MongoDB[(MongoDB / In-Memory Fallback)]
        GeoCache[2dsphere Geospatial Index & 7-Day TTL]
    end

    Client -->|REST & Websockets| API
    Client --> LeafletMap
    API --> DestService
    DestService --> Photon
    API --> PlacesService
    PlacesService --> GeoCache
    PlacesService --> Overpass
    API --> Decision Engine
    Decision Engine --> Candidates
    Candidates --> HardFilter
    HardFilter --> SatMatrix
    SatMatrix --> Fairness
    Fairness --> SocialChoice
    SocialChoice --> ParetoFrontier
    ParetoFrontier --> TSPRouter
```

---

## 📦 Modular Decision Packs

- 🍕 **Food & Dining Pack**: Where to eat across any destination in India. Balances pure veg, vegan, halal, dhabas, street food, cafes, and fine dining.
- 🗺️ **Trip & Day Route Pack**: Stays, viewpoints, heritage forts, and museums. Assembles an optimized day itinerary using a time-window-aware TSP heuristic (Nearest Neighbor + 2-Opt).
- ✨ **Custom Options Pack**: Type your own options in INR (movie night, board games, gift ideas, pitches). 100% standalone with zero external API dependencies.

---

## 🚀 Quickstart & Setup

### Prerequisites
- Node.js v18+ (tested on v24)
- npm v9+
- *(Optional)* Local MongoDB instance. **If MongoDB is not installed, GroupPick automatically boots an in-memory MongoDB instance with zero configuration!**

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/vaiss/grouppick.git
cd grouppick
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/grouppick
JWT_SECRET=grouppick_super_secret_jwt_dev_key_replace_in_prod
CLIENT_URL=http://localhost:5173
```

### 3. Seed Realistic Indian Demo Data
Populate Indian demo groups (`GP-DELHI`, `GP-GOA`), places across 10 Indian cities, and demo accounts:
```bash
npm run seed
```
Demo accounts:
- **Organizer Email**: `organizer@grouppick.com`
- **Password**: `password123`
- **Pre-seeded Delhi Food Group**: `/lobby/GP-DELHI`
- **Pre-seeded Goa Trip Group**: `/lobby/GP-GOA`

### 4. Run the Full Application
Start server and client concurrently:
```bash
npm run dev
```

Open your browser to:
- 🌐 **Web App**: [http://localhost:5173](http://localhost:5173)
- 📚 **Interactive Swagger API Docs**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- 🩺 **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 📡 API Endpoints

### Destinations
- `GET /api/destinations/search?q={query}&limit=8`: Search-as-you-type Indian destinations via Photon geocoder.
- `GET /api/destinations/popular`: Get 8 popular Indian destinations chips.
- `GET /api/destinations/lookup?q={query}`: Single Nominatim lookup fallback (rate-limited).

### Places & Pricing
- `GET /api/places?destinationId={id}&destination={name}&lat={lat}&lng={lng}&radius=5000&packType=food`: Get places around destination served from 2dsphere MongoDB cache (7-day TTL) or Overpass API.
- `GET /api/places/search`: Backwards-compatible direct places search.
- `POST /api/places/:id/report-price`: Report actual price paid in INR (`{ amount: 450 }`). Calculates median once 3+ reports exist.

### Groups & Decisions
- `POST /api/groups`: Create group with `destination: { name, state, lat, lng, bbox }`.
- `GET /api/groups/:idOrCode`: Fetch public group details (no private member budgets leaked).
- `POST /api/groups/:idOrCode/join`: No-signup join with displayName and avatar color.
- `PUT /api/groups/:idOrCode/preferences`: Submit private budget, hard limits, and soft wishes.
- `GET /api/groups/:idOrCode/status`: Check group response status and aggregate feasible ceiling.
- `POST /api/groups/:idOrCode/decide`: Run decision engine and generate 3 Pareto options.
- `POST /api/decisions/:id/confirm`: Organizer confirms the winning option.

---

## 🧪 Running Automated Tests

Run the full Jest test suite covering Indian destinations, Overpass normalizer, 2dsphere caching, price reporting, decision engine, and privacy guarantees:
```bash
npm test
```

---

## 🛡️ License

MIT License. Built with ❤️ for frictionless group harmony.
