import { Request, Response, NextFunction, Application } from 'express'; // Application türü için
import * as qs from 'qs';
import { _sanitize, sanitize, has } from './sanitize-utils';

interface MiddlewareOptions {
  replaceWith?: string;
  onSanitize?: (data: {
    req: Request;
    key: 'body' | 'params' | 'query' | 'headers';
  }) => void;
  dryRun?: boolean;
  allowDots?: boolean;
  fields?: ('body' | 'params' | 'query' | 'headers')[];
}
/**
 * Express middleware'i, gelen isteğin (req.body, req.query, req.params, req.headers) NoSQL enjeksiyon saldırılarına karşı temizlenmesini sağlar.
 * Orijinal istek objesini değiştirmek yerine, bu özelliklerin temizlenmiş (sanitized) versiyonlarını req.sanitizedBody, req.sanitizedQuery vb. gibi yeni özelliklere atar.
 * Güvenli veri erişimi için geliştiricilerin KESİNLİKLE 'sanitized' önekli özellikleri kullanması gerekir.
 * ÖNEMLİ: `req.params`'ın güvenilir bir şekilde temizlenebilmesi için, `mongoSanitizer()` middleware'i, ilgili rota tanımında (örneğin: `app.get('/path/:id', mongoSanitizer(), (req, res) => { ... })` veya `router.get('/path/:id', mongoSanitizer(), (req, res) => { ... })`) parametreleri kullanan rota işleyicisinden hemen önce yerleştirilmelidir.
 * @param options - Middleware seçenekleri.
 * @returns Express middleware fonksiyonu.
 */

/**
 * Express middleware to prevent NoSQL injection attacks by sanitizing req.body, req.query, req.params, and req.headers of the incoming request.
 * Instead of modifying the original request object, it assigns the sanitized versions of these properties to new properties like req.sanitizedBody, req.sanitizedQuery, etc.
 * Developers MUST use the 'sanitized' prefixed properties for secure data access.
 * IMPORTANT: For `req.params` to be reliably sanitized, the `mongoSanitizer()` middleware should be placed directly before the route handler within its specific route definition (e.g., `app.get('/path/:id', mongoSanitizer(), (req, res) => { ... })` or `router.get('/path/:id', mongoSanitizer(), (req, res) => { ... })`).
 * @param options - Middleware options.
 * @returns Express middleware function.
 */

/**
 * Express-Middleware zur Verhinderung von NoSQL-Injection-Angriffen durch Bereinigung von req.body, req.query, req.params und req.headers der eingehenden Anfrage.
 * Anstatt das ursprüngliche Anfrageobjekt zu ändern, weist es die bereinigten Versionen dieser Eigenschaften neuen Eigenschaften wie req.sanitizedBody, req.sanitizedQuery usw. zu.
 * Entwickler MÜSSEN die mit 'sanitized' präfixierten Eigenschaften für einen sicheren Datenzugriff verwenden.
 * WICHTIG: Damit `req.params` zuverlässig bereinigt werden kann, sollte die `mongoSanitizer()`-Middleware direkt vor dem Routen-Handler innerhalb seiner spezifischen Routendefinition platziert werden (z. B. `app.get('/path/:id', mongoSanitizer(), (req, res) => { ... })` oder `router.get('/path/:id', mongoSanitizer(), (req, res) => { ... })`).
 * @param options - Middleware-Optionen.
 * @returns Express-Middleware-Funktion.
 */

function expressSanitize(options: MiddlewareOptions = {}) {
  const hasOnSanitize = typeof options.onSanitize === 'function';
  const fieldsToSanitize = options.fields || [
    'body',
    'params',
    'query',
    'headers',
  ];

  return function (req: Request, res: Response, next: NextFunction) {
    // Güvenli erişim sağlamak ve TypeScript hatalarını önlemek için temizlenmiş alanları başlatır.
    // Initializes sanitized fields to ensure safe access and prevent TypeScript errors.
    // Initialisiert bereinigte Felder für sicheren Zugriff und zur Vermeidung von TypeScript-Fehlern.
    if (!(req as any).sanitizedBody) {
      (req as any).sanitizedBody = {};
    }
    if (!(req as any).sanitizedQuery) {
      (req as any).sanitizedQuery = {};
    }
    if (!(req as any).sanitizedParams) {
      (req as any).sanitizedParams = {};
    }
    if (!(req as any).sanitizedHeaders) {
      (req as any).sanitizedHeaders = {};
    }

    // Query
    if (fieldsToSanitize.includes('query') && req.url) {
      const queryStringIndex = req.url.indexOf('?');
      if (queryStringIndex !== -1) {
        const rawQueryString = req.url.substring(queryStringIndex + 1);
        const parsedQuery = qs.parse(rawQueryString, {
          allowDots: options.allowDots,
          allowPrototypes: false,
        });

        const { isSanitized, target: sanitizedQuery } = _sanitize(
          parsedQuery,
          options
        );
        (req as any).sanitizedQuery = sanitizedQuery;

        if (isSanitized && hasOnSanitize) {
          options.onSanitize!({ req, key: 'query' });
        }
      }
    }

    // Params
    if (
      fieldsToSanitize.includes('params') &&
      req.params &&
      Object.keys(req.params).length > 0
    ) {
      const tempParams: Record<string, any> = {};
      let paramsFound = false;

      // Express'in req.params objesinin özel yapısından dolayı, anahtarları güvenli bir şekilde kopyalar.
      // Safely copies keys from Express's req.params object due to its unique structure.
      // Kopiert Schlüssel sicher vom req.params-Objekt von Express aufgrund seiner einzigartigen Struktur.
      for (const key in req.params) {
        if (Object.prototype.hasOwnProperty.call(req.params, key)) {
          tempParams[key] = (req.params as any)[key];
          paramsFound = true;
        }
      }

      if (!paramsFound) {
        // params objesinde anahtar bulunamazsa yedek olarak Object.getOwnPropertyNames() kullanılır.
        // Uses Object.getOwnPropertyNames() as a fallback if no keys are found in the params object.
        // Verwendet Object.getOwnPropertyNames() als Fallback, falls keine Schlüssel im params-Objekt gefunden werden.
        const ownPropertyNames = Object.getOwnPropertyNames(req.params);
        if (ownPropertyNames.length > 0) {
          ownPropertyNames.forEach((key) => {
            tempParams[key] = (req.params as any)[key];
            paramsFound = true;
          });
        }
      }

      if (paramsFound) {
        const { isSanitized, target: sanitizedParams } = _sanitize(
          tempParams,
          options
        );
        (req as any).sanitizedParams = sanitizedParams;

        if (isSanitized && hasOnSanitize) {
          options.onSanitize!({ req, key: 'params' });
        }
      }
    }

    // Body
    if (
      fieldsToSanitize.includes('body') &&
      (req as any).body &&
      typeof (req as any).body === 'object'
    ) {
      const { isSanitized, target: sanitizedBody } = _sanitize(
        (req as any).body,
        options
      );
      (req as any).sanitizedBody = sanitizedBody;

      if (isSanitized && hasOnSanitize) {
        options.onSanitize!({ req, key: 'body' });
      }
    }

    // Headers
    if (
      fieldsToSanitize.includes('headers') &&
      (req as any).headers &&
      typeof (req as any).headers === 'object'
    ) {
      const { isSanitized, target: sanitizedHeaders } = _sanitize(
        (req as any).headers,
        options
      );
      (req as any).sanitizedHeaders = sanitizedHeaders;

      if (isSanitized && hasOnSanitize) {
        options.onSanitize!({ req, key: 'headers' });
      }
    }

    next();
  };
}

const sanitizer = expressSanitize;
export default sanitizer;
export { sanitize, has };
