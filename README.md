# mongo-sanitizer

`mongo-sanitizer` is an Express.js middleware to protect your application from NoSQL injection attacks. It sanitizes `req.body`, `req.query`, `req.params`, and `req.headers` by replacing `$` and `.` characters, which have special meaning in NoSQL queries.

## Why `mongo-sanitizer?`

NoSQL databases interpret `$` and `.` as operators or for nested fields. Malicious input using these characters can lead to unauthorized data access or modification. `mongo-sanitizer` prevents this by providing sanitized copies of your request data (e.g., `req.sanitizedBody`), leaving original data untouched.

## Installation

`npm install mongo-sanitizer`
or
`yarn add mongo-sanitizer`

## Usage

Always use the **sanitized** prefixed properties (e.g., `req.sanitizedBody`) for secure data access.

**Basic Application** (for `req.body`, `req.query`, `req.headers`)

Apply mongo-sanitizer globally for most request data:

```javascript
import express from 'express';
import mongoSanitizer from 'mongo-sanitizer';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply globally
app.use(mongoSanitizer());

app.post('/api/data', (req, res) => {
  // Use sanitized data
  console.log('Sanitized Body:', req.sanitizedBody);
  res.json({ sanitizedData: req.sanitizedBody });
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

**Route-Specific Application** (Crucial for `req.params`)

`req.params` are populated after route matching. For reliable sanitization, apply `mongoSanitizer()` directly within the route definition:

```javascript
import express from 'express';
import mongoSanitizer from 'mongo-sanitizer';

const app = express();
app.use(express.json());

app.get('/api/users/:userId', mongoSanitizer(), (req, res) => {
  // Use sanitized params
  console.log('Sanitized Params:', req.sanitizedParams);
  res.json({ sanitizedUserId: req.sanitizedParams?.userId });
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

### Options

Customize the middleware with an options object:

```javascript
mongoSanitizer({
  replaceWith?: string; // Default: '_'
  fields?: ('body' | 'params' | 'query' | 'headers')[]; // Default: all
  // ... other options for advanced use (onSanitize, dryRun, allowDots)
})
```

Example: Replace with a dash, only sanitize body and query.

```javascript
app.use(mongoSanitizer({ replaceWith: '-', fields: ['body', 'query'] }));
```

### Manual Sanitization

You can also use helper functions for manual sanitization or checking:

```javascript
import { sanitize, has } from 'mongo-sanitizer';

const maliciousString = 'user.$name';
const cleanedString = sanitize(maliciousString); // "user__name"

const containsMalicious = has('price.$lt'); // true
```

### ⚠️ WARNING: Potential Collisions When Using replaceWith: ''

When using replaceWith: '' in the sanitizer middleware, there is a risk of key collisions and unexpected data changes.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.