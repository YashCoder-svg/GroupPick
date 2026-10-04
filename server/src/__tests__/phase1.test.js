import request from 'supertest';
import app from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { Group } from '../models/Group.js';
import { Member } from '../models/Member.js';
import { Preference } from '../models/Preference.js';
import { User } from '../models/User.js';
import { Place } from '../models/Place.js';
import { ensureSeedPlaces } from '../services/placesService.js';

describe('Phase 1: API Foundations, Models, Auth, and Indian Destinations', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await connectDB();
    await ensureSeedPlaces();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await Preference.deleteMany({});
    await Member.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  describe('Documentation & System Endpoints', () => {
    test('Swagger UI documentation is served at /api/docs', async () => {
      const res = await request(app).get('/api/docs/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('swagger-ui');
      expect(res.text).toContain('GroupPick API Documentation');
    });

    test('OpenAPI spec endpoint /api/docs.json contains all required endpoints', async () => {
      const res = await request(app).get('/api/docs.json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toMatch(/^3\./);
      expect(res.body.paths['/api/groups']).toBeDefined();
      expect(res.body.paths['/api/groups/{id}/join']).toBeDefined();
      expect(res.body.paths['/api/groups/{id}/preferences']).toBeDefined();
      expect(res.body.paths['/api/groups/{id}/status']).toBeDefined();
      expect(res.body.paths['/api/packs']).toBeDefined();
      expect(res.body.paths['/api/places/search']).toBeDefined();
      expect(res.body.paths['/api/destinations/search']).toBeDefined();
      expect(res.body.paths['/api/places']).toBeDefined();
      expect(res.body.paths['/api/places/{id}/report-price']).toBeDefined();
    });

    test('Health check endpoint returns status ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    test('Packs endpoint returns Food, Trip, and Custom packs', async () => {
      const res = await request(app).get('/api/packs');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const packIds = res.body.map((p) => p.id);
      expect(packIds).toContain('food');
      expect(packIds).toContain('trip');
      expect(packIds).toContain('custom');
    });

    test('Places search returns seeded offline Indian places', async () => {
      const res = await request(app).get('/api/places/search?city=Delhi&packType=food');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].city).toBe('Delhi');
    });
  });

  describe('Indian Destination Handling (Photon Geocoder & Caching)', () => {
    test('GET /api/destinations/search returns suggestions for Indian places', async () => {
      // Test search for Pushkar / Manali
      const res = await request(app).get('/api/destinations/search?q=Pushkar');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].name.toLowerCase()).toContain('pushkar');
      expect(res.body[0].country).toBe('India');
      expect(res.body[0].lat).toBeDefined();
      expect(res.body[0].lng).toBeDefined();
    });

    test('GET /api/destinations/popular returns the 8 popular chips', async () => {
      const res = await request(app).get('/api/destinations/popular');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(8);
      const names = res.body.map((d) => d.name);
      expect(names).toContain('Goa');
      expect(names).toContain('Manali');
      expect(names).toContain('Jaipur');
    });

    test('GET /api/places serves second request for the same destination from cache', async () => {
      // First request (hits seed / cache)
      const res1 = await request(app).get('/api/places?destination=Delhi&packType=food');
      expect(res1.status).toBe(200);
      expect(res1.body.places).toBeDefined();
      expect(res1.body.places.length).toBeGreaterThan(0);

      // Second request (must be served from cache)
      const res2 = await request(app).get('/api/places?destination=Delhi&packType=food');
      expect(res2.status).toBe(200);
      expect(res2.body.source).toBe('cache');
      expect(res2.body.places.length).toBeGreaterThanOrEqual(1);
    });

    test('POST /api/places/:id/report-price records actual price and calculates median after 3 reports', async () => {
      // Find a seeded place
      const place = await Place.findOne({ city: 'Delhi', packType: 'food' });
      expect(place).toBeDefined();

      // Initial priceSource is estimated
      expect(place.priceSource).toBe('estimated');

      // 1. Report first price (₹400)
      const rep1 = await request(app)
        .post(`/api/places/${place._id}/report-price`)
        .send({ amount: 400 });
      expect(rep1.status).toBe(200);

      // 2. Report second price (₹500)
      const rep2 = await request(app)
        .post(`/api/places/${place._id}/report-price`)
        .send({ amount: 500 });
      expect(rep2.status).toBe(200);

      // 3. Report third price (₹450) -> triggers median calculation
      const rep3 = await request(app)
        .post(`/api/places/${place._id}/report-price`)
        .send({ amount: 450 });
      expect(rep3.status).toBe(200);

      const updatedPlace = await Place.findById(place._id);
      expect(updatedPlace.priceReports).toHaveLength(3);
      expect(updatedPlace.priceSource).toBe('reported');
      // Median of [400, 450, 500] is 450
      expect(updatedPlace.estimatedCostPerPerson).toBe(450);
      expect(updatedPlace.priceTier).toBe(2);
    });
  });

  describe('Organizer Authentication', () => {
    test('Registers a new organizer and returns JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Organizer Alex',
          email: 'alex@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('alex@example.com');
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    test('Fails on duplicate email registration', async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Alex 1',
        email: 'duplicate@example.com',
        password: 'Password123!',
      });

      const res = await request(app).post('/api/auth/register').send({
        name: 'Alex 2',
        email: 'duplicate@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(409);
    });

    test('Logs in existing user and accesses /api/auth/me', async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Alex Login',
        email: 'login@example.com',
        password: 'Password123!',
      });

      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'Password123!',
      });

      expect(loginRes.status).toBe(200);
      const token = loginRes.body.token;

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe('login@example.com');
    });
  });

  describe('Group Creation, No-Signup Join & Privacy Guarantees', () => {
    test('Anonymous user can create group with Indian destination, invite members, and submit preferences', async () => {
      // 1. Create Group with Indian destination
      const createRes = await request(app)
        .post('/api/groups')
        .send({
          title: 'Friday Delhi Flatmates Dinner',
          packId: 'food',
          organizerName: 'Sarah (Host)',
          destination: {
            name: 'Delhi',
            state: 'Delhi',
            lat: 28.6139,
            lng: 77.209,
            bbox: [76.84, 28.4, 77.34, 28.88],
          },
          packConfig: { city: 'Delhi' },
        });

      expect(createRes.status).toBe(201);
      const { group, member: hostMember, guestToken: hostToken } = createRes.body;
      expect(group.code).toMatch(/^GP-[A-Z0-9]+$/);
      expect(group.destination.name).toBe('Delhi');
      expect(group.destination.lat).toBe(28.6139);
      expect(hostMember.isOrganizer).toBe(true);
      expect(hostToken).toBeDefined();

      // 2. Member 2 joins via share code without signup
      const joinMayaRes = await request(app)
        .post(`/api/groups/${group.code}/join`)
        .send({ displayName: 'Maya', avatarColor: '#10B981' });

      expect(joinMayaRes.status).toBe(201);
      const mayaToken = joinMayaRes.body.guestToken;

      // 3. Member 3 joins via share code without signup
      const joinRaviRes = await request(app)
        .post(`/api/groups/${group.code}/join`)
        .send({ displayName: 'Ravi', avatarColor: '#F59E0B' });

      expect(joinRaviRes.status).toBe(201);
      const raviToken = joinRaviRes.body.guestToken;

      // 4. Maya submits preferences privately with budget ₹450
      const mayaPrefRes = await request(app)
        .put(`/api/groups/${group.code}/preferences`)
        .set('x-member-token', mayaToken)
        .send({
          budget: 450,
          hardLimits: ['vegetarian'],
          softWishes: ['pure-veg'],
          rankedPicks: ['seed-delhi-food-2'],
        });

      expect(mayaPrefRes.status).toBe(200);
      expect(mayaPrefRes.body.hasResponded).toBe(true);

      // 5. Ravi submits preferences privately with a lower budget ₹200 (group ceiling)
      const raviPrefRes = await request(app)
        .put(`/api/groups/${group.code}/preferences`)
        .set('x-member-token', raviToken)
        .send({
          budget: 200,
          hardLimits: ['halal'],
          softWishes: ['quick-bite'],
          rankedPicks: ['seed-delhi-food-3'],
        });

      expect(raviPrefRes.status).toBe(200);

      // 6. Host submits preferences with budget ₹600
      const hostPrefRes = await request(app)
        .put(`/api/groups/${group.code}/preferences`)
        .set('x-member-token', hostToken)
        .send({
          budget: 600,
          hardLimits: [],
          softWishes: ['kebabs'],
        });

      expect(hostPrefRes.status).toBe(200);

      // 7. CRITICAL PRIVACY VERIFICATION 1: Public group endpoint
      const publicGroupRes = await request(app).get(`/api/groups/${group.code}`);
      expect(publicGroupRes.status).toBe(200);
      expect(publicGroupRes.body.members).toHaveLength(3);

      for (const m of publicGroupRes.body.members) {
        expect(m.budget).toBeUndefined();
        expect(m.hardLimits).toBeUndefined();
        expect(m.softWishes).toBeUndefined();
        expect(m.guestToken).toBeUndefined();
      }

      // 8. CRITICAL PRIVACY VERIFICATION 2: Status endpoint
      const statusRes = await request(app).get(`/api/groups/${group.code}/status`);
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.totalMembers).toBe(3);
      expect(statusRes.body.respondedCount).toBe(3);
      expect(statusRes.body.allResponded).toBe(true);

      // Verify aggregate ceiling: lowest budget was Ravi (₹200), highest Host (₹600)
      expect(statusRes.body.feasibleBudgetRange).toEqual({
        min: 200,
        max: 600,
        groupCeiling: 200, // Strict feasible ceiling for the whole group
        totalSubmittedBudgets: 3,
      });

      // Assert NO individual budget is tied to any member in status response
      for (const m of statusRes.body.members) {
        expect(m.budget).toBeUndefined();
        expect(m.privateBudget).toBeUndefined();
      }

      // Raw response body string must not leak 'budget": 200' attached to Ravi
      const bodyStr = JSON.stringify(statusRes.body);
      expect(bodyStr).not.toContain('"Ravi":200');
      expect(bodyStr).not.toContain('"Maya":450');
    });

    test('Unauthorized requests cannot submit member preferences', async () => {
      const createRes = await request(app).post('/api/groups').send({
        title: 'Security Test Group',
        packId: 'food',
        organizerName: 'Admin',
      });

      const groupId = createRes.body.group._id;

      // Request without x-member-token header should be rejected
      const noTokenRes = await request(app)
        .put(`/api/groups/${groupId}/preferences`)
        .send({ budget: 300 });

      expect(noTokenRes.status).toBe(401);

      // Request with invalid token should be rejected
      const badTokenRes = await request(app)
        .put(`/api/groups/${groupId}/preferences`)
        .set('x-member-token', 'completely-fake-token-12345')
        .send({ budget: 300 });

      expect(badTokenRes.status).toBe(403);
    });
  });
});
