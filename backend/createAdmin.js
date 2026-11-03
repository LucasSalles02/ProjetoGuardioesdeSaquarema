// Compatibility entrypoint: administrative provisioning now uses PostgreSQL.
process.argv.splice(2, 0, "admin");
await import("../scripts/backend.js");
