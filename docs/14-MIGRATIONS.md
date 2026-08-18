# MIGRATIONS.md — Política de migraciones

## SchemaVersion

La versión del schema se almacena en `PropertiesService.getScriptProperties()`.
Es una única versión global del sistema. Las hojas NO tienen versión individual.

```javascript
PropertiesService.getScriptProperties().getProperty('schemaVersion')
```

## Formato

```
migrations/
├── migration_001.gs    ← schema inicial
├── migration_002.gs    ← agregar campo AccountingDate a Expenses
├── migration_003.gs    ← renombrar campo
└── ...
```

## Script de migración

```javascript
function runMigrations() {
  const currentVersion = _getSchemaVersion();
  const migrations = [
    { version: 2, fn: migrate_002 },
    { version: 3, fn: migrate_003 },
    // ...
  ];

  migrations
    .filter(m => m.version > currentVersion)
    .sort((a, b) => a.version - b.version)
    .forEach(m => {
      m.fn();
      _setSchemaVersion(m.version);
      Logger.log(`Migration ${m.version} applied`);
    });
}

function _getSchemaVersion() {
  const props = PropertiesService.getScriptProperties();
  return parseInt(props.getProperty('schemaVersion') || '0');
}

function _setSchemaVersion(version) {
  PropertiesService.getScriptProperties().setProperty('schemaVersion', version);
}
```

## Ejemplo de migración

```javascript
function migrate_002() {
  // Agregar campo AccountingDate a Expenses
  const sheet = getSheet('Expenses');
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  if (!header.includes('AccountingDate')) {
    sheet.getRange(1, header.length + 1).setValue('AccountingDate');
    // Rellenar con ExpenseDate para filas existentes
    const data = sheet.getDataRange().getValues();
    const expenseDateCol = header.indexOf('ExpenseDate') + 1;
    for (let i = 1; i < data.length; i++) {
      sheet.getRange(i + 1, header.length + 1).setValue(data[i][expenseDateCol - 1]);
    }
  }
}
```

## Reglas

- Nunca borrar campos (solo agregar o renombrar)
- Siempre migrar hacia adelante (sin rollbacks)
- Cada migración debe ser idempotente (seguro ejecutar dos veces)
- Probar migración en hoja de desarrollo antes de producción
- Registrar cada migración en CHANGELOG.md
