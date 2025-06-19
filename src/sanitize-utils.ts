import cloneDeep from 'lodash.clonedeep';

// NoSQL sorgularında özel anlamı olan "$" ve "." karakterlerini tanımlar.
// Bunları değiştirmek, istenmeyen sorgu manipülasyonlarını engeller.

// Defines "$" and "." characters, which have special meaning in NoSQL queries.
// Replacing these prevents unintended query manipulations.

// Definiert die Zeichen "$" und ".", die in NoSQL-Abfragen eine besondere Bedeutung haben.
// Das Ersetzen dieser Zeichen verhindert unbeabsichtigte Abfrage-Manipulationen.
const NO_SQL_CHARS_TO_REPLACE = /\$/g;
const DOT_NO_SQL_CHARS_TO_REPLACE = /[\$\.]/g;
/**
 * Checks if a value is a plain object (not an array, null, or other types).
 * This is crucial for recursively traversing only plain objects.
 * @param val The value to check.
 * @returns True if the value is a plain object, false otherwise.
 */

// Bir değerin düz bir JavaScript objesi olup olmadığını kontrol eder.
// Bu, recursive temizleme sırasında sadece gerçek objeleri işlemek için önemlidir.

// Checks if a value is a plain JavaScript object.
// This is crucial for recursively processing only actual objects during sanitization.

// Prüft, ob ein Wert ein einfaches JavaScript-Objekt ist.
// Dies ist entscheidend, um während der Bereinigung nur echte Objekte rekursiv zu verarbeiten.
export function isPlainObject(val: any): val is Record<string, any> {
  return (
    typeof val === 'object' &&
    val !== null &&
    !Array.isArray(val) &&
    val.constructor === Object
  );
}

/**
 * Recursively sanitizes an object or array by replacing '$' and '.' in keys and values.
 * It now also handles direct string sanitization for values, as seen in req.params.
 * @param obj The object or value to sanitize.
 * @param options Middleware options, including replaceWith and dryRun.
 * @returns An object containing the sanitized target and a boolean indicating if any sanitization occurred.
 */

// Objeleri, dizileri ve stringleri recursive olarak temizler.
// Anahtarlardaki ve değerlerdeki "$" ve "." karakterlerini değiştirir.

// Recursively sanitizes objects, arrays, and strings.
// Replaces "$" and "." characters in keys and values.

// Bereinigt Objekte, Arrays und Strings rekursiv.
// Ersetzt die Zeichen "$" und "." in Schlüsseln und Werten.
export function _sanitize(
  obj: any,
  options: { replaceWith?: string; dryRun?: boolean; allowDots?: boolean } = {}
) {
  const replaceWith =
    options.hasOwnProperty('replaceWith') &&
    typeof options.replaceWith === 'string'
      ? options.replaceWith
      : '_';
  const dryRun = options.dryRun || false;
  const allowDots = options.allowDots || false;
  let hasSanitized = false;

  // Gelen değer bir string ise doğrudan temizler.
  // Bu, özellikle req.params gibi doğrudan string değerler için önemlidir.

  // Sanitizes the input directly if it is a string.
  // This is especially important for direct string values like req.params.

  // Bereinigt die Eingabe direkt, falls es sich um einen String handelt.
  // Dies ist besonders wichtig für direkte String-Werte wie req.params.
  if (typeof obj === 'string') {
    const charRegex = allowDots
      ? NO_SQL_CHARS_TO_REPLACE
      : DOT_NO_SQL_CHARS_TO_REPLACE;

    if (obj.match(charRegex)) {
      hasSanitized = true;
      return {
        isSanitized: hasSanitized,
        target: dryRun ? obj : obj.replace(charRegex, replaceWith),
      };
    }
    return { isSanitized: hasSanitized, target: obj };
  }

  // String olmayan ilkel değerleri (sayılar, boolean'lar vb.) olduğu gibi döndürür.
  // Bu tür değerlerde güvenlik açığı karakterleri bulunmaz.

  // Returns non-string primitive values (numbers, booleans, etc.) as is.
  // These types do not contain security vulnerability characters.

  // Gibt nicht-string-primitive Werte (Zahlen, Booleans usw.) unverändert zurück.
  // Diese Typen enthalten keine sicherheitsrelevanten Zeichen.
  if (!isPlainObject(obj) && !Array.isArray(obj)) {
    return { isSanitized: hasSanitized, target: obj };
  }

  // Orijinal objeyi değiştirmemek için derin bir kopya oluşturur.
  // Temizleme işlemleri bu kopya üzerinde yapılır.

  // Creates a deep copy to avoid modifying the the original object.
  // Sanitization operations are performed on this copy.

  // Erstellt eine tiefe Kopie, um das ursprüngliche Objekt nicht zu verändern.
  // Bereinigungsvorgänge werden auf dieser Kopie durchgeführt.
  const target = cloneDeep(obj);

  // Objelerin ve dizilerin içindeki her elemanı recursive olarak temizler.
  // Hem anahtarları hem de değerleri kontrol eder ve değiştirir.

  // Recursively sanitizes every element within objects and arrays.
  // It inspects and replaces both keys and values.

  // Bereinigt rekursiv jedes Element innerhalb von Objekten und Arrays.
  // Überprüft und ersetzt dabei sowohl Schlüssel als auch Werte.
  function _recursiveSanitize(current: any): any {
    if (isPlainObject(current)) {
      const newObj: Record<string, any> = {};
      for (const key in current) {
        if (Object.prototype.hasOwnProperty.call(current, key)) {
          let newKey = key;
          let val = current[key];

          const keyCharRegex = allowDots
            ? NO_SQL_CHARS_TO_REPLACE
            : DOT_NO_SQL_CHARS_TO_REPLACE;

          // Sanitize key
          if (key.match(keyCharRegex)) {
            newKey = key.replace(keyCharRegex, replaceWith);
            if (!dryRun) hasSanitized = true;
          }

          // Recursively sanitize value
          if (isPlainObject(val) || Array.isArray(val)) {
            newObj[newKey] = _recursiveSanitize(val);
          } else if (typeof val === 'string') {
            const valCharRegex = allowDots
              ? NO_SQL_CHARS_TO_REPLACE
              : DOT_NO_SQL_CHARS_TO_REPLACE;
            // Sanitize string values
            if (val.match(valCharRegex)) {
              if (!dryRun) {
                newObj[newKey] = val.replace(valCharRegex, replaceWith);
                hasSanitized = true;
              } else {
                newObj[newKey] = val; // In dry run, return original
              }
            } else {
              newObj[newKey] = val;
            }
          } else {
            newObj[newKey] = val;
          }
        }
      }
      return newObj;
    } else if (Array.isArray(current)) {
      return current.map((item) => {
        if (isPlainObject(item) || Array.isArray(item)) {
          return _recursiveSanitize(item);
        } else if (typeof item === 'string') {
          const itemCharRegex = allowDots
            ? NO_SQL_CHARS_TO_REPLACE
            : DOT_NO_SQL_CHARS_TO_REPLACE;
          // Sanitize string values in arrays
          if (item.match(itemCharRegex)) {
            if (!dryRun) {
              hasSanitized = true;
              return item.replace(itemCharRegex, replaceWith);
            }
          }
          return item; // In dry run, or no match, return original
        } else {
          return item;
        }
      });
    }
    return current;
  }

  const sanitizedTarget = _recursiveSanitize(target);

  return { isSanitized: hasSanitized, target: dryRun ? obj : sanitizedTarget };
}

/**
 * Helper function to sanitize a single string or an object/array.
 * This is the primary function to be exposed for manual sanitization.
 * @param value The value to sanitize.
 * @param options Options for sanitization (replaceWith, dryRun).
 * @returns The sanitized value.
 */

// Tek bir değeri, objeyi veya diziyi manuel olarak temizlemek için kullanılır.
// Middleware dışında doğrudan çağrılabilir.

// Used for manually sanitizing a single value, object, or array.
// Can be called directly outside the middleware.

// Wird zur manuellen Bereinigung eines einzelnen Werts, Objekts oder Arrays verwendet.
// Kann direkt außerhalb der Middleware aufgerufen werden.
export function sanitize(
  value: any,
  options?: { replaceWith?: string; dryRun?: boolean }
) {
  return _sanitize(value, options).target;
}

/**
 * Helper function to check if a value contains NoSQL injection characters without sanitizing it.
 * @param value The value to check.
 * @returns True if the value contains NoSQL injection characters, false otherwise.
 */

// Bir değerin NoSQL enjeksiyon karakterleri içerip içermediğini kontrol eder.
// Temizleme yapmaz, sadece kontrol eder.

// Checks if a value contains NoSQL injection characters without sanitizing it.
// It performs a check, but does not modify the value.

// Überprüft, ob ein Wert NoSQL-Injection-Zeichen enthält, ohne ihn zu bereinigen.
// Führt eine Prüfung durch, nimmt aber keine Änderung am Wert vor.
export function has(value: any): boolean {
  return _sanitize(value, { dryRun: true }).isSanitized;
}
