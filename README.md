# @fincuratech/fuse-sdk-js

TypeScript SDK for the Patterson Fuse EHR API.

## Installation

```bash
pnpm add @fincuratech/fuse-sdk-js
```

## Authentication

The Fuse API requires a JWT access token obtained from the Patterson Fuse login flow. The token must be extracted externally (e.g., via Playwright browser automation or manual login) and passed to the SDK.

The SDK does **not** handle authentication itself — you must provide a valid token.

## Quick Start

```typescript
import { createFuseClient } from '@fincuratech/fuse-sdk-js';

const fuse = createFuseClient({
  accessToken: 'your-jwt-token',
  practiceId: 'your-practice-id',
  locationId: 'your-location-id',
});

// Search for claims by patient name
const claims = await fuse.claims.search('Smith');

// Get claim details
const claim = await fuse.claims.getById('claim-uuid');

// Get available payment types
const paymentTypes = await fuse.paymentTypes.list();
```

## Token Utilities

```typescript
import { extractConfigFromToken } from '@fincuratech/fuse-sdk-js';

// Extract practiceId from the JWT token claims
const config = extractConfigFromToken(token);
// config.practiceId => from extension_Fuse_PracticeId claim
```

## API Reference

### Claims

- `fuse.claims.search(searchText, options?)` — Search claims via the claimsGrid endpoint
- `fuse.claims.searchAll(searchText, options?)` — Search both received and non-received claims, deduplicated
- `fuse.claims.getById(claimId)` — Get detailed claim information including service line items
- `fuse.claims.close(params)` — Close a claim after payment has been posted

### Payments

- `fuse.payments.postBulkInsurancePayment(params)` — Post a bulk insurance payment
- `fuse.payments.calculateCreditDistribution(serviceLineItems, totalAmount)` — Pre-validate payment distribution
- `fuse.payments.validatePaymentAmounts(serviceLineItems, eraPayments, totalAmount)` — Validate ERA amounts against Fuse limits

### Adjustments

- `fuse.adjustments.getTypes()` — Get available adjustment types
- `fuse.adjustments.post(params)` — Post an adjustment (e.g., insurance write-offs)

### Payment Types

- `fuse.paymentTypes.list()` — List available insurance payment types

### Appointments

- `fuse.appointments.search({ from, to, appointmentTypeIds? })` — Search appointments across a date range; handles pagination internally and returns all rows

### Patients

- `fuse.patients.getDashboard(patientId)` — Fetch the patient dashboard including benefit plans (insurance coverage)

## Logging

The SDK is silent by default. Enable logging for debugging:

```typescript
import { setLogger, createConsoleLogger } from '@fincuratech/fuse-sdk-js';

// Enable console logging
setLogger(createConsoleLogger('debug'));
```

You can also plug in your own logger (e.g., Winston, Pino):

```typescript
import { setLogger } from '@fincuratech/fuse-sdk-js';

setLogger({
  debug: (msg, meta) => myLogger.debug(msg, meta),
  info: (msg, meta) => myLogger.info(msg, meta),
  warn: (msg, meta) => myLogger.warn(msg, meta),
  error: (msg, meta) => myLogger.error(msg, meta),
});
```

## Contributing

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
```
