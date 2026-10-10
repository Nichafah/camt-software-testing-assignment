# Election Backend API Spec

Oct 4, 2026

## Overview

The election backend is an Express JSON API with 12 routes: account sign-up and login, public election data, commission admin, and voting. This spec is read from the code on branch `jest/lab/06-outside-in`.

- Base URL: `http://localhost:3000` (set by `PORT`)
- Requests and responses are `application/json`
- Protected routes take `Authorization: Bearer <token>`
- Health check: `GET /health` returns `200 {"status":"ok"}`

## Authentication

Log in with `POST /auth/login` to get a JWT, then send it as `Authorization: Bearer <token>`. Tokens are signed with `JWT_SECRET` (default `dev-secret`) and expire after 1 hour.

The token carries `userId`, `role` and `districtId`. A missing, malformed or expired token gives `401`; the wrong role gives `403`.

| Role | Gets it by | Can call, beyond public routes |
| --- | --- | --- |
| `VOTER` | Default on `POST /auth/register` | `GET /me/candidates`, `PUT /me/vote` |
| `COMMISSIONER` | An admin calls `PATCH /admin/users/:id/role` | `POST /parties`, `POST /districts/:id/candidates`, `GET /me/candidates` |
| `ADMIN` | Seeded in the database; the API cannot grant it | `PATCH /admin/users/:id/role`, `GET /me/candidates` |

Public routes need no token: `/health`, `/auth/register`, `/auth/login`, `GET /districts`, `GET /parties`, `GET /parties/:id`, `GET /districts/:id/results`.

## Endpoints

| Method | Path | Auth | Success |
| --- | --- | --- | --- |
| GET | `/health` | Public | 200 |
| POST | `/auth/register` | Public | 201 user |
| POST | `/auth/login` | Public | 200 token |
| PATCH | `/admin/users/:id/role` | ADMIN | 200 user |
| GET | `/districts` | Public | 200 districts |
| GET | `/parties` | Public | 200 parties |
| GET | `/parties/:id` | Public | 200 party with candidates |
| POST | `/parties` | COMMISSIONER | 201 party |
| POST | `/districts/:id/candidates` | COMMISSIONER | 201 candidate |
| GET | `/districts/:id/results` | Public | 200 results |
| GET | `/me/candidates` | Any signed-in user | 200 ballot |
| PUT | `/me/vote` | VOTER | 201 first vote, 200 changed vote |

The examples below are real responses, recorded on the e2e seed (admin `1100000000016`, commissioner `1100000000024`). They run in order: each one builds on the data the one before it created.

### Request headers

| Header | When | Value |
| --- | --- | --- |
| `Content-Type` | Every request with a body (`POST`, `PATCH`, `PUT`) | `application/json` |
| `Authorization` | Every route marked ADMIN, COMMISSIONER, VOTER or signed-in | `Bearer <token>` from `POST /auth/login` |

Send `Content-Type: application/json` with every body. Without it the server ignores the body and answers as if it were empty. For example, a register request with a valid body but no `Content-Type` gets `400 invalid national id`.

In the examples, `<admin token>`, `<commissioner token>` and `<voter token>` stand for the `token` each account gets from `POST /auth/login`.

### GET /health

```http
GET /health HTTP/1.1
```

Response `200`:

```json
{ "status": "ok" }
```

### POST /auth/register

Creates a `VOTER` account and returns the user without `passwordHash`.

```http
POST /auth/register HTTP/1.1
Content-Type: application/json

{
  "nationalId": "1103700012346",
  "password": "voter1234",
  "firstName": "Somchai",
  "lastName": "Jaidee",
  "address": "1 Nimman Rd",
  "districtId": "CM-1"
}
```

Response `201`:

```json
{
  "id": 3,
  "nationalId": "1103700012346",
  "firstName": "Somchai",
  "lastName": "Jaidee",
  "address": "1 Nimman Rd",
  "districtId": "CM-1",
  "role": "VOTER"
}
```

- 400 `invalid national id`: fails the Thai national ID checksum
- 400 `password must be at least 8 characters`
- 400 `first name, last name and address are required`: blank after trimming
- 400 `unknown district`
- 409 `national id already registered`

### POST /auth/login

```http
POST /auth/login HTTP/1.1
Content-Type: application/json

{ "nationalId": "1103700012346", "password": "voter1234" }
```

Response `200`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsInJvbGUiOiJWT1RFUiIsImRpc3RyaWN0SWQiOiJDTS0xIiwiaWF0IjoxNzkxMDc5NjI3LCJleHAiOjE3OTEwODMyMjd9.tbvk8B1ApdtqYHr80xq9lXM0taUn7fVgDH-VpsAs1S0"
}
```

The token's payload decodes to:

```json
{ "userId": 3, "role": "VOTER", "districtId": "CM-1", "iat": 1791079627, "exp": 1791083227 }
```

`exp` is 3,600 seconds (1 hour) after `iat`.

- 401 `invalid national id or password`: same message for an unknown ID or a wrong password

### PATCH /admin/users/:id/role

```http
PATCH /admin/users/4/role HTTP/1.1
Content-Type: application/json
Authorization: Bearer <admin token>

{ "role": "COMMISSIONER" }
```

Response `200`:

```json
{
  "id": 4,
  "nationalId": "1509900000017",
  "firstName": "Somsri",
  "lastName": "Rakdee",
  "address": "239 Huay Kaew Rd",
  "districtId": "CM-1",
  "role": "COMMISSIONER"
}
```

- 401 `authentication required`: no token, or an invalid one
- 403 `forbidden`: the caller is not an admin
- 400 `role must be VOTER or COMMISSIONER`: `ADMIN` cannot be granted
- 404 `user not found`

### GET /districts

```http
GET /districts HTTP/1.1
```

Response `200`, the 6 seeded districts:

```json
[
  { "id": "BKK-1", "province": "กรุงเทพมหานคร", "number": 1 },
  { "id": "BKK-2", "province": "กรุงเทพมหานคร", "number": 2 },
  { "id": "LPN-1", "province": "ลำพูน", "number": 1 },
  { "id": "CM-1", "province": "เชียงใหม่", "number": 1 },
  { "id": "CM-2", "province": "เชียงใหม่", "number": 2 },
  { "id": "CM-3", "province": "เชียงใหม่", "number": 3 }
]
```

### POST /parties

Name and policy are trimmed; `logoUrl` is optional and defaults to `null`.

```http
POST /parties HTTP/1.1
Content-Type: application/json
Authorization: Bearer <commissioner token>

{
  "name": "Green Lanna",
  "policy": "Electric red trucks on every route",
  "logoUrl": "https://example.com/green-lanna.png"
}
```

Response `201`:

```json
{
  "id": 1,
  "name": "Green Lanna",
  "logoUrl": "https://example.com/green-lanna.png",
  "policy": "Electric red trucks on every route"
}
```

A second request without `logoUrl`, `{ "name": "Ping River", "policy": "Clean PM2.5 within one year" }`, created party `2` with `"logoUrl": null`.

- 401 `authentication required`
- 403 `forbidden`: the caller is not a commissioner
- 400 `party name is required` / `party policy is required`
- 409 `party name already exists`

### GET /parties

```http
GET /parties HTTP/1.1
```

Response `200`:

```json
[
  {
    "id": 1,
    "name": "Green Lanna",
    "logoUrl": "https://example.com/green-lanna.png",
    "policy": "Electric red trucks on every route"
  },
  {
    "id": 2,
    "name": "Ping River",
    "logoUrl": null,
    "policy": "Clean PM2.5 within one year"
  }
]
```

### POST /districts/:id/candidates

`photoUrl` is optional and defaults to `null`.

```http
POST /districts/CM-1/candidates HTTP/1.1
Content-Type: application/json
Authorization: Bearer <commissioner token>

{
  "partyId": 1,
  "number": 1,
  "firstName": "Anan",
  "lastName": "Srisuk",
  "photoUrl": "https://example.com/anan.jpg"
}
```

Response `201`:

```json
{
  "id": 1,
  "districtId": "CM-1",
  "partyId": 1,
  "partyName": "Green Lanna",
  "number": 1,
  "firstName": "Anan",
  "lastName": "Srisuk",
  "photoUrl": "https://example.com/anan.jpg"
}
```

A second request, `{ "partyId": 2, "number": 2, "firstName": "Malee", "lastName": "Wongkham" }`, created candidate `2` for Ping River.

- 401 `authentication required`
- 403 `forbidden`: the caller is not a commissioner
- 404 `district not found`
- 400 `unknown party`
- 400 `candidate number must be a positive integer`
- 400 `candidate first name and last name are required`
- 409 `candidate number already used in this district`
- 409 `party already has a candidate in this district`: one candidate per party per district

### GET /parties/:id

Returns the party plus `candidates`, one per district it stands in.

```http
GET /parties/1 HTTP/1.1
```

Response `200`:

```json
{
  "id": 1,
  "name": "Green Lanna",
  "logoUrl": "https://example.com/green-lanna.png",
  "policy": "Electric red trucks on every route",
  "candidates": [
    {
      "id": 1,
      "districtId": "CM-1",
      "partyId": 1,
      "partyName": "Green Lanna",
      "number": 1,
      "firstName": "Anan",
      "lastName": "Srisuk",
      "photoUrl": "https://example.com/anan.jpg"
    }
  ]
}
```

- 404 `party not found`

### GET /districts/:id/results

Vote counts are never returned yet: no route can close a district's poll, so `closed` is always `false`.

```http
GET /districts/CM-1/results HTTP/1.1
```

Response `200`:

```json
{
  "district": { "id": "CM-1", "province": "เชียงใหม่", "number": 1 },
  "closed": false,
  "candidates": [
    { "number": 1, "firstName": "Anan", "lastName": "Srisuk", "partyName": "Green Lanna" },
    { "number": 2, "firstName": "Malee", "lastName": "Wongkham", "partyName": "Ping River" }
  ]
}
```

- 404 `district not found`

### PUT /me/vote

Casts the vote, or replaces an earlier one; a voter holds at most one vote.

First vote, as voter `3`:

```http
PUT /me/vote HTTP/1.1
Content-Type: application/json
Authorization: Bearer <voter token>

{ "candidateId": 1 }
```

Response `201`:

```json
{ "candidateId": 1, "changed": false, "votedAt": "2026-10-04T02:07:08.008Z" }
```

Changed vote, same voter:

```http
PUT /me/vote HTTP/1.1
Content-Type: application/json
Authorization: Bearer <voter token>

{ "candidateId": 2 }
```

Response `200`:

```json
{ "candidateId": 2, "changed": true, "votedAt": "2026-10-04T02:07:08.017Z" }
```

- 401 `authentication required`
- 403 `only voters can vote`
- 400 `candidateId is required`
- 409 `election is not open`: no election row, or before its `opens_at`
- 404 `candidate not found`
- 403 `candidate is not in your district`

### GET /me/candidates

The caller's ballot: the candidates in the token's district, ordered by number. `selected` marks the caller's current vote.

```http
GET /me/candidates HTTP/1.1
Authorization: Bearer <voter token>
```

Response `200`, as voter `3` after the changed vote:

```json
[
  { "id": 1, "number": 1, "name": "Anan Srisuk", "party": "Green Lanna", "selected": false },
  { "id": 2, "number": 2, "name": "Malee Wongkham", "party": "Ping River", "selected": true }
]
```

- 401 `authentication required`

## Data models

These are the shapes routes return. `passwordHash` never leaves the server.

**User** (from register and role change)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | number |  |
| `nationalId` | string | 13 digits with a valid checksum |
| `firstName`, `lastName`, `address` | string | Trimmed |
| `districtId` | string |  |
| `role` | `VOTER` \| `COMMISSIONER` \| `ADMIN` |  |

**District**

| Field | Type |
| --- | --- |
| `id` | string |
| `province` | string |
| `number` | number |

**Party**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | number |  |
| `name` | string | Unique |
| `logoUrl` | string \| null |  |
| `policy` | string |  |

**Candidate**

| Field | Type | Notes |
| --- | --- | --- |
| `id` | number |  |
| `districtId` | string |  |
| `partyId`, `partyName` | number, string | One candidate per party per district |
| `number` | number | Ballot number, unique within the district |
| `firstName`, `lastName` | string |  |
| `photoUrl` | string \| null |  |

The ballot from `GET /me/candidates` uses its own shorter shape, `{ id, number, name, party, selected }`, with `name` as first and last name joined.

## Errors

Every error body is `{ "error": "<message>" }`. Services throw a `DomainError` subclass, and one handler in `app.ts` turns it into its status.

| Status | Error class | Meaning |
| --- | --- | --- |
| 400 | `ValidationError` | Bad or missing input |
| 401 | `UnauthorizedError` | No valid token, or a failed login |
| 403 | `ForbiddenError` | Signed in, but the wrong role or district |
| 404 | `NotFoundError` | The district, party, candidate or user does not exist |
| 409 | `ConflictError` | Clashes with existing data, or the election is not open |
| 500 | Anything else | `{ "error": "internal server error" }`, details logged on the server |

Known gaps:

- Malformed JSON returns 500, not 400. The handler treats Express's parse error like any unknown error (checked with a request body of `{bad`).
- `/me/candidates` and `/me/vote` skip the shared error classes and middleware. They check the JWT themselves, read `JWT_SECRET` straight from the environment, and write their errors inline in the same `{ error }` shape.
