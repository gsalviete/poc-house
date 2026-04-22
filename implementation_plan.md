# 🏠 poc-house — Gift/Contribution List for House Move

> Architecture & Implementation Plan

---

## 1. High-Level Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        RENDER (Free Tier)                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Next.js App (Bun.js Runtime)                 │  │
│  │  ┌─────────────────────┐  ┌────────────────────────────┐ │  │
│  │  │   React Frontend    │  │    API Routes (Next.js)     │ │  │
│  │  │                     │  │    /api/items               │ │  │
│  │  │  • Public pages     │  │    /api/contributions       │ │  │
│  │  │  • Admin dashboard  │  │    /api/admin/*             │ │  │
│  │  │  • Pix QR display   │  │    /api/upload              │ │  │
│  │  │  • Receipt upload   │  │    /api/auth/login          │ │  │
│  │  └─────────────────────┘  └──────────┬─────────────────┘ │  │
│  └──────────────────────────────────────┼───────────────────┘  │
└─────────────────────────────────────────┼───────────────────────┘
                                          │
                    ┌─────────────────────┼────────────────────┐
                    │           SUPABASE                       │
                    │  ┌─────────────┐  ┌──────────────────┐  │
                    │  │ PostgreSQL  │  │  Supabase Storage │  │
                    │  │             │  │                   │  │
                    │  │ • items     │  │  /item-images/    │  │
                    │  │ • contribs  │  │  /receipts/       │  │
                    │  │ • admin     │  │                   │  │
                    │  └─────────────┘  └──────────────────┘  │
                    └─────────────────────────────────────────┘
```

### Data Flow

```
┌──────────┐    GET /api/items     ┌──────────────┐    SELECT *     ┌────────────┐
│  Visitor  │ ──────────────────▶  │  Next.js API  │ ─────────────▶ │ PostgreSQL │
│ (Browser) │ ◀──────────────────  │   Routes      │ ◀───────────── │            │
└──────────┘   JSON response       └──────┬───────┘   rows          └────────────┘
     │                                     │
     │  POST /api/contributions            │
     │  (name, item_id, receipt)           │
     │─────────────────────────────────────│
     │                                     │
     │                              ┌──────▼───────┐
     │                              │   Supabase   │
     │                              │   Storage    │
     │                              │  (receipt)   │
     │                              └──────────────┘
     │
     ▼
  Pix QR Code generated client-side (pix-utils library)
  No server call needed for QR generation
```

### Architecture Decision: Why Next.js (not separate backend)

| Factor | Decision |
|--------|----------|
| **Monolith simplicity** | Next.js API routes = backend + frontend in one deploy |
| **Bun.js compatibility** | Next.js runs on Bun with `bun --bun next dev` |
| **Single deploy target** | One Render service, not two |
| **SSR for public pages** | Better SEO for the public item list |
| **No cold start issues** | Single process, no serverless function cold starts |

---

## 2. Database Schema

### ERD

```
┌──────────────────────┐       ┌───────────────────────────────┐
│       items           │       │       contributions            │
├──────────────────────┤       ├───────────────────────────────┤
│ id         UUID PK    │◄──┐  │ id             UUID PK         │
│ name       VARCHAR     │   │  │ item_id        UUID FK NULL    │──┐
│ description TEXT       │   │  │ contributor_name VARCHAR       │  │
│ price_cents INTEGER    │   └──│ amount_cents    INTEGER        │  │
│ image_url  VARCHAR     │      │ receipt_url    VARCHAR NULL    │  │
│ external_link VARCHAR  │      │ status         contribution_   │  │
│ is_active  BOOLEAN     │      │                status ENUM     │  │
│ created_at TIMESTAMPTZ │      │ pix_tx_id      VARCHAR NULL    │  │
│ updated_at TIMESTAMPTZ │      │ admin_notes    TEXT NULL        │  │
└──────────────────────┘       │ created_at     TIMESTAMPTZ     │  │
                                │ updated_at     TIMESTAMPTZ     │  │
┌──────────────────────┐       └───────────────────────────────┘  │
│       admin           │                                          │
├──────────────────────┤       item_id is NULLABLE to support     │
│ id         UUID PK    │       "free contributions" without       │
│ username   VARCHAR     │       selecting a specific item.        │
│ password_hash VARCHAR  │                                          │
│ created_at TIMESTAMPTZ │                                          │
└──────────────────────┘                                          │
```

### SQL Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Contribution status enum
CREATE TYPE contribution_status AS ENUM (
  'pending',      -- Receipt uploaded, waiting admin review
  'approved',     -- Admin confirmed payment
  'rejected'      -- Admin rejected (fake receipt, wrong amount, etc.)
);

-- Items table
CREATE TABLE items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  price_cents   INTEGER NOT NULL CHECK (price_cents > 0),
  image_url     VARCHAR(500),
  external_link VARCHAR(500),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contributions table
CREATE TABLE contributions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id           UUID REFERENCES items(id) ON DELETE SET NULL,
  contributor_name  VARCHAR(100) NOT NULL,
  amount_cents      INTEGER NOT NULL CHECK (amount_cents > 0),
  receipt_url       VARCHAR(500),
  status            contribution_status NOT NULL DEFAULT 'pending',
  pix_tx_id         VARCHAR(100),
  admin_notes       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin table (single row, seeded)
CREATE TABLE admin (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX idx_contributions_item_id ON contributions(item_id);
CREATE INDEX idx_contributions_status ON contributions(status);
CREATE INDEX idx_items_is_active ON items(is_active);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER contributions_updated_at
  BEFORE UPDATE ON contributions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| `price_cents INTEGER` | Avoid floating point errors. R$ 150.00 = 15000 cents |
| `item_id` nullable | Allows "free contributions" without selecting an item |
| `ON DELETE SET NULL` | If an item is deleted, contribution records remain |
| Single `admin` table | Only one user; no roles, no complexity |
| No `users` table | Public users provide name only, no auth required |
| `receipt_url` nullable | Contribution can exist before receipt upload (2-step flow) |

---

## 3. API Design

### Base URL: `/api`

### Public Endpoints

#### `GET /api/items`

List all active items with their contribution summary.

```json
// Response 200
{
  "items": [
    {
      "id": "uuid-1",
      "name": "Sofá 3 lugares",
      "description": "Sofá retrátil cinza",
      "price_cents": 250000,
      "price_display": "R$ 2.500,00",
      "image_url": "https://xxx.supabase.co/storage/v1/object/public/item-images/sofa.jpg",
      "external_link": "https://magazineluiza.com.br/sofa-xyz",
      "total_contributed_cents": 75000,
      "contribution_count": 2,
      "is_fully_funded": false
    }
  ]
}
```

#### `GET /api/items/:id`

Get a single item with full details.

```json
// Response 200
{
  "id": "uuid-1",
  "name": "Sofá 3 lugares",
  "description": "Sofá retrátil cinza",
  "price_cents": 250000,
  "price_display": "R$ 2.500,00",
  "image_url": "https://xxx.supabase.co/storage/v1/object/public/item-images/sofa.jpg",
  "external_link": "https://magazineluiza.com.br/sofa-xyz",
  "total_contributed_cents": 75000,
  "remaining_cents": 175000,
  "contributions": [
    {
      "contributor_name": "João",
      "amount_cents": 50000,
      "amount_display": "R$ 500,00",
      "status": "approved",
      "created_at": "2026-04-20T10:00:00Z"
    }
  ]
}
```

#### `POST /api/contributions`

Create a new contribution (with or without an item).

```json
// Request
{
  "item_id": "uuid-1",           // optional — null for free contribution
  "contributor_name": "Maria",
  "amount_cents": 50000           // R$ 500,00
}

// Response 201
{
  "id": "uuid-c1",
  "pix_payload": "00020126...",   // EMV Pix payload for QR code
  "pix_qr_base64": "data:image/png;base64,...",
  "amount_display": "R$ 500,00",
  "status": "pending"
}
```

**Validation:**
- `contributor_name`: required, 2-100 chars, trimmed
- `amount_cents`: required, integer > 0, max 100000000 (R$ 1.000.000)
- `item_id`: if provided, must exist and be active

#### `POST /api/contributions/:id/receipt`

Upload receipt image for an existing contribution.

```
Content-Type: multipart/form-data
Field: receipt (file, max 5MB, jpeg/png/webp)

// Response 200
{
  "receipt_url": "https://xxx.supabase.co/storage/v1/object/public/receipts/uuid-c1-receipt.webp",
  "status": "pending"
}
```

**Validation:**
- File size: max 5MB
- File types: `image/jpeg`, `image/png`, `image/webp`
- Contribution must exist and have `status = 'pending'`

#### `GET /api/pix/payload`

Generate a Pix payload for a given amount (utility endpoint).

```json
// Request (query params)
GET /api/pix/payload?amount_cents=50000

// Response 200
{
  "payload": "00020126580014br.gov.bcb.pix0136email@example.com5204000053039865406500.005802BR5913Nome Completo6009SAO PAULO62070503***6304ABCD",
  "qr_base64": "data:image/png;base64,..."
}
```

---

### Admin Endpoints (all require `Authorization: Bearer <token>`)

#### `POST /api/auth/login`

```json
// Request
{
  "username": "admin",
  "password": "secure-password-here"
}

// Response 200
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 86400
}

// Response 401
{
  "error": "Invalid credentials"
}
```

#### `GET /api/admin/items`

List all items (including inactive).

#### `POST /api/admin/items`

Create item.

```json
// Request (multipart/form-data for image upload)
{
  "name": "Sofá 3 lugares",
  "description": "Sofá retrátil cinza",
  "price_cents": 250000,
  "external_link": "https://magazineluiza.com.br/sofa-xyz"
}
// + image file field

// Response 201
{
  "id": "uuid-1",
  "name": "Sofá 3 lugares",
  "image_url": "https://xxx.supabase.co/storage/v1/..."
}
```

#### `PUT /api/admin/items/:id`

Update item (partial update supported).

#### `DELETE /api/admin/items/:id`

Soft-delete (sets `is_active = false`). Hard-delete only if no contributions.

#### `GET /api/admin/contributions`

List all contributions with filters.

```
GET /api/admin/contributions?status=pending&page=1&per_page=20
```

#### `PATCH /api/admin/contributions/:id/status`

Approve or reject a contribution.

```json
// Request
{
  "status": "approved",        // or "rejected"
  "admin_notes": "Receipt verified"  // optional
}

// Response 200
{
  "id": "uuid-c1",
  "status": "approved",
  "admin_notes": "Receipt verified"
}
```

### API Response Format (consistent)

```json
// Success
{
  "data": { ... },
  "meta": { "page": 1, "per_page": 20, "total": 42 }  // only for lists
}

// Error
{
  "error": "Human-readable error message",
  "code": "VALIDATION_ERROR",
  "details": [{ "field": "name", "message": "Required" }]
}
```

### HTTP Status Codes Used

| Code | When |
|------|------|
| `200` | Success (GET, PUT, PATCH) |
| `201` | Created (POST) |
| `400` | Validation error |
| `401` | Auth required / invalid token |
| `404` | Resource not found |
| `413` | File too large |
| `422` | Unprocessable (business rule violation) |
| `500` | Internal server error |

---

## 4. Pix Integration

### How Pix Works (Simplified)

Pix uses the **EMV QR Code** standard (EMVCo). A static or dynamic QR code contains a payload string that any banking app can read.

For this project, we use **static Pix with embedded amount** — no bank API required.

### Pix Payload Structure (BR Code)

```
ID 00: Payload Format Indicator = "01"
ID 26: Merchant Account Info (Pix)
  └─ ID 00: GUI = "br.gov.bcb.pix"
  └─ ID 01: Pix Key (email, phone, or random key)
ID 52: Merchant Category Code = "0000"
ID 53: Transaction Currency = "986" (BRL)
ID 54: Transaction Amount = "500.00"
ID 58: Country Code = "BR"
ID 59: Merchant Name = "NOME COMPLETO"
ID 60: Merchant City = "CIDADE"
ID 62: Additional Data
  └─ ID 05: Reference Label (txid)
ID 63: CRC16 checksum
```

### Library Decision

**Use: `pixqrcodegen` (npm)** — Pure JS, no native dependencies, works in Bun.

Alternative: Build the EMV payload manually (it's just string concatenation + CRC16). We'll implement a lightweight utility for full control.

### Implementation

```typescript
// src/lib/pix.ts

import QRCode from 'qrcode';

interface PixPayloadParams {
  pixKey: string;
  pixKeyType: 'email' | 'phone' | 'cpf' | 'random';
  merchantName: string;
  merchantCity: string;
  amountCents: number;
  txId?: string;
}

function padValue(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function generatePixPayload(params: PixPayloadParams): string {
  const { pixKey, merchantName, merchantCity, amountCents, txId } = params;

  const amount = (amountCents / 100).toFixed(2);

  const merchantAccountInfo = padValue(
    '26',
    padValue('00', 'br.gov.bcb.pix') + padValue('01', pixKey)
  );

  let payload = '';
  payload += padValue('00', '01'); // Payload format
  payload += merchantAccountInfo;
  payload += padValue('52', '0000'); // MCC
  payload += padValue('53', '986'); // BRL
  payload += padValue('54', amount); // Amount
  payload += padValue('58', 'BR'); // Country
  payload += padValue('59', merchantName.substring(0, 25)); // Max 25 chars
  payload += padValue('60', merchantCity.substring(0, 15)); // Max 15 chars

  if (txId) {
    payload += padValue('62', padValue('05', txId.substring(0, 25)));
  }

  // CRC placeholder
  payload += '6304';
  const checksum = crc16(payload);
  payload += checksum;

  return payload;
}

export async function generatePixQRCode(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: 300,
    margin: 2,
    color: { dark: '#000', light: '#FFF' },
  });
}
```

### Environment Variables for Pix

```env
PIX_KEY=email@example.com
PIX_KEY_TYPE=email
PIX_MERCHANT_NAME=NOME COMPLETO
PIX_MERCHANT_CITY=SAO PAULO
```

### Flow

```
1. User selects item → POST /api/contributions
2. Server generates txId (contribution UUID short)
3. Server generates Pix payload with amount + txId
4. Server generates QR code image (base64)
5. Response includes payload + QR → client displays
6. User scans QR → pays via banking app
7. User uploads receipt screenshot → POST /api/contributions/:id/receipt
8. Admin reviews receipt → PATCH /api/admin/contributions/:id/status
```

---

## 5. File Upload Strategy

### Storage Structure (Supabase Storage)

```
Buckets:
├── item-images/          (Public bucket)
│   ├── {item-uuid}.webp
│   └── {item-uuid}.webp
│
└── receipts/             (Private bucket — admin access only)
    ├── {contribution-uuid}-receipt.webp
    └── {contribution-uuid}-receipt.webp
```

### Upload Flow

```
Client                          Server                       Supabase Storage
  │                               │                               │
  │  POST /api/admin/items        │                               │
  │  (multipart/form-data)        │                               │
  │──────────────────────────────▶│                               │
  │                               │  supabase.storage              │
  │                               │  .from('item-images')          │
  │                               │  .upload(path, buffer)         │
  │                               │──────────────────────────────▶│
  │                               │◀──────────────────────────────│
  │                               │  URL returned                  │
  │◀──────────────────────────────│                               │
  │  { image_url: "https://..." } │                               │
```

### Implementation

```typescript
// src/lib/storage.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface UploadResult {
  url: string;
  path: string;
}

export async function uploadItemImage(
  itemId: string,
  file: File
): Promise<UploadResult> {
  const ext = 'webp'; // Always convert/store as webp
  const path = `${itemId}.${ext}`;

  const { error } = await supabase.storage
    .from('item-images')
    .upload(path, file, {
      contentType: 'image/webp',
      upsert: true, // Allow image replacement
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from('item-images')
    .getPublicUrl(path);

  return { url: urlData.publicUrl, path };
}

export async function uploadReceipt(
  contributionId: string,
  file: File
): Promise<UploadResult> {
  const path = `${contributionId}-receipt.webp`;

  const { error } = await supabase.storage
    .from('receipts')
    .upload(path, file, {
      contentType: file.type,
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  // Receipts bucket is private — generate signed URL for admin
  const { data: signedData } = await supabase.storage
    .from('receipts')
    .createSignedUrl(path, 60 * 60 * 24); // 24h expiry

  return {
    url: signedData?.signedUrl || '',
    path,
  };
}
```

### Security Considerations

| Risk | Mitigation |
|------|------------|
| **Oversized files** | Server-side check: max 5MB |
| **Wrong file types** | Accept only `image/jpeg`, `image/png`, `image/webp` — check MIME type, not just extension |
| **Malicious filenames** | Ignore original filename, use UUID-based naming |
| **Public receipt access** | Receipts bucket is **private**, use signed URLs (24h expiry) for admin |
| **Storage abuse** | Rate-limit upload endpoints (max 10 uploads/hour per IP) |
| **Item images** | Public bucket (CDN-friendly), no sensitive data |

### File Naming

```
item-images/{item-uuid}.webp          ← deterministic, allows upsert
receipts/{contribution-uuid}-receipt.webp  ← one receipt per contribution
```

---

## 6. Concurrency & Edge Cases

### Two Users Selecting the Same Item

**Decision: Allow it.** This is NOT e-commerce. Multiple people can contribute to the same item. In fact, that's a feature (partial contributions).

```
Item: Sofá — R$ 2.500,00
  ├── Maria: R$ 500,00 ✅ approved
  ├── João:  R$ 300,00 ✅ approved
  └── Ana:   R$ 200,00 ⏳ pending
  Total: R$ 1.000,00 / R$ 2.500,00
```

**What if total contributions exceed item price?**
- Allow it. Admin can reject excess contributions.
- Show a warning on the frontend: "Este item já foi totalmente contribuído!"
- Do NOT block the contribution — someone might want to give more.

### Fake Receipts

**Decision: Manual verification only.** This is a personal app among friends/family.

| Mitigation | Implementation |
|------------|----------------|
| Admin reviews every receipt | `status` field + admin dashboard |
| Receipt shows timestamp | Metadata from upload |
| Admin adds notes | `admin_notes` field for rejections |
| Repeat offenders | Handled socially — it's friends/family |

> [!NOTE]
> For a personal app, social trust is the primary security mechanism. The admin knows the contributors.

### Abandoned Flows

**Scenario:** User creates contribution but never uploads receipt.

| Strategy | Implementation |
|----------|----------------|
| Contributions stay `pending` forever | No auto-cleanup (admin can see and delete) |
| No "reservation" system | Item is never locked |
| Admin can filter by status | Dashboard shows pending contributions |
| Optional: stale cleanup | Future: cron job to mark 7-day-old pending as `expired` |

### Race Conditions

**No critical race conditions exist because:**
1. Items are never "locked" — no inventory concept
2. Contributions are additive — no state transitions that conflict
3. Only one admin — no concurrent approval conflicts
4. Receipt upload is idempotent (upsert)

---

## 7. Admin Access Strategy

### Approach: JWT + bcrypt (Lightweight)

No OAuth, no sessions, no cookies. Simple bearer token.

```
Login Flow:
1. Admin visits /admin/login
2. POST /api/auth/login { username, password }
3. Server verifies bcrypt hash
4. Server returns JWT (24h expiry)
5. Frontend stores in memory (NOT localStorage — refresh = re-login)
6. All /api/admin/* requests include Authorization header
```

### Implementation

```typescript
// src/lib/auth.ts

import { sign, verify } from 'jsonwebtoken';
import { hash, compare } from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET!;
const TOKEN_EXPIRY = '24h';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(password, hashedPassword);
}

export function generateToken(adminId: string): string {
  return sign({ sub: adminId, role: 'admin' }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

export function verifyToken(token: string): { sub: string; role: string } {
  return verify(token, JWT_SECRET) as { sub: string; role: string };
}
```

### Auth Middleware (Next.js API route)

```typescript
// src/lib/middleware/auth.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export function requireAdmin(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: any) => {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const token = authHeader.split(' ')[1];
      const payload = verifyToken(token);
      if (payload.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return handler(req, context);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  };
}
```

### Admin Seeding (one-time script)

```typescript
// scripts/seed-admin.ts
import { hashPassword } from '../src/lib/auth';
import { db } from '../src/lib/db';

const username = process.env.ADMIN_USERNAME || 'admin';
const password = process.env.ADMIN_PASSWORD!;

const passwordHash = await hashPassword(password);

await db.query(
  `INSERT INTO admin (username, password_hash) VALUES ($1, $2)
   ON CONFLICT (username) DO UPDATE SET password_hash = $2`,
  [username, passwordHash]
);

console.log(`Admin user "${username}" seeded.`);
```

### Security Notes

| Aspect | Decision |
|--------|----------|
| **Token storage** | In-memory only (React state). Refresh = re-login. |
| **Token expiry** | 24 hours. Short enough for security, long enough for a session. |
| **Password hashing** | bcrypt with cost factor 12 |
| **Rate limiting** | 5 login attempts per minute per IP |
| **HTTPS** | Mandatory in production (Render provides it) |

---

## 8. Frontend Structure

### Pages

```
/ (Public)
├── /                    → Item grid/list (main page)
├── /item/[id]           → Item detail + Pix QR + contribute form
├── /contribute/[id]     → Contribution flow (name → amount → QR → receipt)
├── /contribute/free     → Free contribution (no item selected)
├── /thank-you           → Success page after receipt upload
│
/admin (Protected)
├── /admin/login         → Login form
├── /admin               → Dashboard (overview stats)
├── /admin/items         → Item CRUD (list + create/edit modal)
├── /admin/contributions → Contribution list with filters + approve/reject
```

### Component Tree

```
src/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout (metadata, fonts)
│   ├── page.tsx                      # Public item grid
│   ├── item/[id]/page.tsx           # Item detail
│   ├── contribute/
│   │   ├── [id]/page.tsx            # Contribute to item flow
│   │   └── free/page.tsx            # Free contribution flow
│   ├── thank-you/page.tsx           # Success page
│   ├── admin/
│   │   ├── login/page.tsx           # Login form
│   │   ├── layout.tsx               # Admin layout (sidebar, auth check)
│   │   ├── page.tsx                 # Dashboard
│   │   ├── items/page.tsx           # Item management
│   │   └── contributions/page.tsx   # Contribution management
│   └── api/                         # API routes
│       ├── items/route.ts
│       ├── items/[id]/route.ts
│       ├── contributions/route.ts
│       ├── contributions/[id]/receipt/route.ts
│       ├── pix/payload/route.ts
│       ├── auth/login/route.ts
│       └── admin/
│           ├── items/route.ts
│           ├── items/[id]/route.ts
│           ├── contributions/route.ts
│           └── contributions/[id]/status/route.ts
│
├── components/
│   ├── ui/                           # Primitive UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Spinner.tsx
│   │   └── FileUpload.tsx
│   ├── public/                       # Public-facing components
│   │   ├── ItemCard.tsx              # Item in grid
│   │   ├── ItemGrid.tsx              # Grid layout
│   │   ├── PixQRCode.tsx             # QR code display
│   │   ├── ContributeForm.tsx        # Name + amount form
│   │   ├── ReceiptUpload.tsx         # Receipt image upload
│   │   ├── ProgressBar.tsx           # Contribution progress
│   │   └── Header.tsx                # Public header
│   └── admin/                        # Admin components
│       ├── Sidebar.tsx
│       ├── ItemForm.tsx              # Create/edit item form
│       ├── ItemTable.tsx             # Item list table
│       ├── ContributionTable.tsx     # Contribution list
│       ├── ReceiptViewer.tsx         # View receipt image
│       ├── StatusBadge.tsx           # Pending/approved/rejected badge
│       └── StatsCards.tsx            # Dashboard overview cards
│
├── lib/                              # Shared utilities
│   ├── api.ts                        # API client (fetch wrapper)
│   ├── auth.ts                       # Auth utilities
│   ├── pix.ts                        # Pix payload + QR
│   ├── db.ts                         # Database client (pg)
│   ├── storage.ts                    # Supabase storage utils
│   ├── format.ts                     # Currency formatting (BRL)
│   ├── validation.ts                 # Zod schemas
│   └── middleware/
│       └── auth.ts                   # Admin auth middleware
│
└── hooks/                            # Custom React hooks
    ├── useAuth.ts                    # Admin auth state
    ├── useItems.ts                   # Item data fetching
    └── useContributions.ts           # Contribution data fetching
```

### State Management

**Decision: No state library.** Use React built-ins:

| State Type | Solution |
|------------|----------|
| **Server data** | `fetch` in Server Components (SSR) + client-side `fetch` for mutations |
| **Admin auth** | `React.Context` + `useState` for JWT token |
| **Form state** | `useState` per form (simple forms) |
| **UI state** | `useState` (modals, filters) |

> [!TIP]
> For a personal app with ~20 items, no caching library (React Query, SWR) is needed. Plain `fetch` + `useEffect` is sufficient. If needed later, add SWR (lightweight).

### UX Flow (Public)

```
┌────────────┐     ┌──────────────┐     ┌───────────────────┐
│  Item Grid  │────▶│ Item Detail  │────▶│  Contribute Form  │
│  (browse)   │     │ (price, desc)│     │  (name, amount)   │
└────────────┘     └──────────────┘     └────────┬──────────┘
                                                  │
                                                  ▼
┌────────────┐     ┌──────────────┐     ┌───────────────────┐
│  Thank You  │◀────│ Upload       │◀────│  Pix QR Code      │
│  (done!)    │     │ Receipt      │     │  (scan & pay)     │
└────────────┘     └──────────────┘     └───────────────────┘
```

---

## 9. Project Structure (Monorepo)

### Folder Layout

```
poc-house/
├── .agent/                    # Agent config (already exists)
├── .github/
│   └── workflows/
│       └── deploy.yml         # CI/CD (optional, for future)
│
├── src/
│   ├── app/                   # Next.js App Router (pages + API)
│   ├── components/            # React components
│   ├── hooks/                 # Custom hooks
│   └── lib/                   # Shared utilities
│
├── public/                    # Static assets
│   ├── favicon.ico
│   └── og-image.png
│
├── scripts/
│   ├── seed-admin.ts          # Seed admin user
│   └── migrate.ts             # Run SQL migrations
│
├── sql/
│   └── 001-initial-schema.sql # SQL migration files
│
├── .env.local                 # Local env vars (git-ignored)
├── .env.example               # Template for env vars
├── .gitignore
├── bun.lock                   # Bun lockfile
├── bunfig.toml                # Bun config
├── next.config.ts             # Next.js config
├── package.json
├── tsconfig.json
├── README.md
└── CODEBASE.md                # Project documentation
```

### Why NOT a separate packages/ structure?

It's a single app. No shared packages needed. Next.js handles both frontend and backend. Adding a `packages/` layer would be premature complexity for a 2-5 day build.

### package.json

```json
{
  "name": "poc-house",
  "private": true,
  "scripts": {
    "dev": "bun --bun next dev",
    "build": "bun --bun next build",
    "start": "bun --bun next start",
    "seed:admin": "bun run scripts/seed-admin.ts",
    "migrate": "bun run scripts/migrate.ts",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.3",
    "react": "^19.0",
    "react-dom": "^19.0",
    "pg": "^8.13",
    "@supabase/supabase-js": "^2.45",
    "bcryptjs": "^2.4",
    "jsonwebtoken": "^9.0",
    "qrcode": "^1.5",
    "zod": "^3.23"
  },
  "devDependencies": {
    "@types/node": "^22.0",
    "@types/react": "^19.0",
    "@types/bcryptjs": "^2.4",
    "@types/jsonwebtoken": "^9.0",
    "@types/pg": "^8.11",
    "@types/qrcode": "^1.5",
    "typescript": "^5.6",
    "eslint": "^9.0",
    "eslint-config-next": "^15.3"
  }
}
```

---

## 10. Deployment Plan

### Step-by-Step: Supabase Setup

```
1. Create Supabase project at https://supabase.com
   → Region: South America (São Paulo) for lowest latency
   → Note: Project URL + API keys

2. Run migrations:
   → Supabase Dashboard → SQL Editor → paste sql/001-initial-schema.sql → Run

3. Create storage buckets:
   → Storage → New Bucket → "item-images" → PUBLIC
   → Storage → New Bucket → "receipts" → PRIVATE

4. Set storage policies:
   → item-images: allow public READ, authenticated INSERT/UPDATE/DELETE
   → receipts: allow authenticated INSERT, authenticated SELECT

5. Copy credentials:
   → Settings → API → Copy: URL, anon key, service_role key
   → Settings → Database → Copy: Connection string
```

### Step-by-Step: Render Setup

```
1. Create Render account at https://render.com

2. New → Web Service → Connect GitHub repo (poc-house)

3. Configure:
   → Name: poc-house
   → Region: Oregon (closest free tier to São Paulo)
   → Branch: main
   → Runtime: Node
   → Build Command: bun install && bun run build
   → Start Command: bun run start
   → Instance Type: Free

4. Environment Variables (add all):
   DATABASE_URL=postgresql://...
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbG...
   SUPABASE_ANON_KEY=eyJhbG...
   JWT_SECRET=<random-64-char-string>
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=<strong-password>
   PIX_KEY=email@example.com
   PIX_KEY_TYPE=email
   PIX_MERCHANT_NAME=NOME COMPLETO
   PIX_MERCHANT_CITY=SAO PAULO
   NODE_ENV=production
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...

5. Deploy:
   → Click "Create Web Service"
   → First deploy takes ~3 min

6. Post-deploy:
   → Run admin seed: Render Shell → bun run seed:admin
   → Verify: Visit https://poc-house.onrender.com
```

### Environment Variables Summary

```env
# .env.example

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# Supabase
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...          # Server-side only (service_role)
SUPABASE_ANON_KEY=eyJhbG...             # Can be public
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...

# Auth
JWT_SECRET=generate-a-random-64-char-string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-in-production

# Pix
PIX_KEY=your-email@example.com
PIX_KEY_TYPE=email
PIX_MERCHANT_NAME=SEU NOME
PIX_MERCHANT_CITY=SUA CIDADE
```

### Render Free Tier Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Spins down after 15min idle | First request after sleep takes ~30s | Acceptable for personal app |
| 750 hours/month | ~31 days continuous | Enough for one service |
| No persistent disk | Use Supabase Storage for files | Already planned |
| Shared CPU | May be slow under load | Personal app — no issue |

---

## 11. MVP vs Future Improvements

### MVP (Build in Days 1-3)

| Feature | Priority | Status |
|---------|----------|--------|
| Database schema + migrations | P0 | Day 1 |
| Admin auth (login/JWT) | P0 | Day 1 |
| Item CRUD (admin) | P0 | Day 1 |
| Public item list (SSR) | P0 | Day 1 |
| Pix QR code generation | P0 | Day 2 |
| Contribution creation flow | P0 | Day 2 |
| Receipt upload | P0 | Day 2 |
| Admin contribution review | P0 | Day 2 |
| Item image upload | P1 | Day 3 |
| Admin dashboard stats | P1 | Day 3 |
| Basic responsive design | P1 | Day 3 |
| Deploy to Render | P0 | Day 3 |

### Skip Initially (Future v2)

| Feature | Why Skip |
|---------|----------|
| Email notifications | Adds complexity (SMTP service). Admin can check dashboard. |
| WhatsApp integration | Requires business API. Share link manually. |
| Image compression/resize | Supabase handles storage. Accept as-is for now. |
| Contribution progress tracking | Nice-to-have, not critical. Add progress bar later. |
| Dark mode | Polish feature. Ship light mode first. |
| i18n | It's in Portuguese. No need for i18n. |
| PWA / service worker | Not needed for a temporary personal app. |
| Automated Pix verification | Requires bank API (Pix webhook). Way overkill. |
| Multiple admin users | Single user is enough. |
| Contribution expiration (cron) | Manually clean up abandoned contributions. |
| Social sharing (OG images) | Nice but not MVP. Add meta tags later. |

### Post-MVP Quick Wins (Day 4-5)

| Feature | Effort |
|---------|--------|
| Contribution progress bar per item | 2h |
| Copy Pix code button (copia e cola) | 1h |
| WhatsApp share link | 1h |
| "Fully funded" badge | 1h |
| Sort/filter items (by price, category) | 2h |

---

## Proposed Changes

### [NEW] Project Foundation

#### [NEW] [package.json](file:///c:/Users/gsalviete/projects/poc-house/package.json)
Project dependencies with Bun + Next.js 15 + React 19 + PostgreSQL + Supabase + Zod.

#### [NEW] [next.config.ts](file:///c:/Users/gsalviete/projects/poc-house/next.config.ts)
Next.js configuration optimized for Bun runtime.

#### [NEW] [tsconfig.json](file:///c:/Users/gsalviete/projects/poc-house/tsconfig.json)
TypeScript config with strict mode and path aliases.

---

### [NEW] Database Layer

#### [NEW] [sql/001-initial-schema.sql](file:///c:/Users/gsalviete/projects/poc-house/sql/001-initial-schema.sql)
PostgreSQL schema with items, contributions, admin tables + triggers.

#### [NEW] [src/lib/db.ts](file:///c:/Users/gsalviete/projects/poc-house/src/lib/db.ts)
PostgreSQL client using `pg` pool with Supabase connection string.

#### [NEW] [scripts/seed-admin.ts](file:///c:/Users/gsalviete/projects/poc-house/scripts/seed-admin.ts)
One-time admin user seeding script.

---

### [NEW] Backend Core

#### [NEW] [src/lib/auth.ts](file:///c:/Users/gsalviete/projects/poc-house/src/lib/auth.ts)
JWT + bcrypt auth utilities.

#### [NEW] [src/lib/pix.ts](file:///c:/Users/gsalviete/projects/poc-house/src/lib/pix.ts)
Pix EMV payload generator + QR code generation.

#### [NEW] [src/lib/storage.ts](file:///c:/Users/gsalviete/projects/poc-house/src/lib/storage.ts)
Supabase Storage wrapper for item images and receipts.

#### [NEW] [src/lib/validation.ts](file:///c:/Users/gsalviete/projects/poc-house/src/lib/validation.ts)
Zod schemas for all API request validation.

#### [NEW] [src/lib/format.ts](file:///c:/Users/gsalviete/projects/poc-house/src/lib/format.ts)
BRL currency formatting and display utilities.

---

### [NEW] API Routes

#### [NEW] [src/app/api/auth/login/route.ts](file:///c:/Users/gsalviete/projects/poc-house/src/app/api/auth/login/route.ts)
Admin login endpoint.

#### [NEW] [src/app/api/items/route.ts](file:///c:/Users/gsalviete/projects/poc-house/src/app/api/items/route.ts)
Public items listing.

#### [NEW] [src/app/api/contributions/route.ts](file:///c:/Users/gsalviete/projects/poc-house/src/app/api/contributions/route.ts)
Contribution creation with Pix payload response.

#### [NEW] [src/app/api/admin/*](file:///c:/Users/gsalviete/projects/poc-house/src/app/api/admin)
Protected admin CRUD endpoints for items and contributions.

---

### [NEW] Frontend Pages & Components

All pages and components listed in Section 8 above.

---

## Verification Plan

### Automated Tests

```bash
# Type checking
bun run typecheck

# Linting
bun run lint

# Build verification
bun run build
```

### Manual Verification

1. **Public flow**: Browse items → Select item → See QR code → Upload receipt
2. **Admin flow**: Login → Create item with image → View contributions → Approve/reject
3. **Pix QR**: Scan generated QR code with a Brazilian banking app — verify it reads correctly
4. **Responsive**: Test on mobile viewport (375px)
5. **Edge cases**: Contribute without item, upload large file (should reject), invalid login

---

## Open Questions

> [!IMPORTANT]
> **Please confirm these before I start implementation:**

1. **Pix key**: What is the actual Pix key (email, phone, or random key) to embed in QR codes?
2. **Merchant name/city**: What name and city should appear in the Pix payload?
3. **Design preference**: Any color scheme or visual style preference? (I'll design something clean and modern if not specified)
4. **Domain**: Will you use the default `poc-house.onrender.com` or a custom domain?
5. **Language**: Should the UI be entirely in Portuguese (pt-BR)?
