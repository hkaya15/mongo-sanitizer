declare namespace Express {
  interface Request {
    // TypeScript'in Express Request objesine yeni özellikler eklemesini sağlar.
    // Bu, paketin temizlenmiş verileri ekleyeceği yerdir.

    // Allows TypeScript to add new properties to the Express Request object.
    // This is where the package will attach the sanitized data.

    // Ermöglicht TypeScript, dem Express Request-Objekt neue Eigenschaften hinzuzufügen.
    // Hier wird das Paket die bereinigten Daten anhängen.
    sanitizedBody?: any;
    sanitizedQuery?: any;
    sanitizedParams?: Record<string, any>;
    sanitizedHeaders?: any;
  }
}
