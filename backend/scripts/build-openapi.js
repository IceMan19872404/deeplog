const fs = require("node:fs");
const path = require("node:path");

const json = (description, schema, example) => ({
  description,
  content: {
    "application/json": {
      schema,
      ...(example ? { example } : {})
    }
  }
});
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const bearerErrors = {
  "401": { $ref: "#/components/responses/Unauthorized" },
  "404": { $ref: "#/components/responses/NotFound" }
};
const validationError = { "400": { $ref: "#/components/responses/ValidationError" } };
const secured = (operation) => ({ security: [{ bearerAuth: [] }], ...operation });
const body = (schema, required = true) => ({
  required,
  content: { "application/json": { schema } }
});
const idParameter = (name, description = `${name} identifier`) => ({
  name,
  in: "path",
  required: true,
  description,
  schema: name === "shareId" ? { type: "string", format: "uuid" } : { type: "integer", minimum: 1 }
});
const tokenParameter = {
  name: "token",
  in: "path",
  required: true,
  description: "64-character opaque share token",
  schema: { type: "string", pattern: "^[a-f0-9]{64}$" }
};

const spec = {
  openapi: "3.1.0",
  info: {
    title: "DeepLog API",
    version: "1.0.0",
    description: "REST contract for DeepLog 2.0. All dates use ISO 8601 and errors share one envelope."
  },
  servers: [{ url: "http://localhost:8080/api/v1", description: "Local Docker environment" }],
  tags: [
    { name: "System" }, { name: "Authentication" }, { name: "Dives" },
    { name: "Sharing" }, { name: "Account" }
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"], operationId: "getHealth", summary: "Check API availability",
        responses: { "200": json("API is available", { type: "object", required: ["status", "service", "timestamp"], properties: { status: { const: "ok" }, service: { const: "deeplog-api" }, timestamp: { type: "string", format: "date-time" } } }) }
      }
    },
    "/health/ready": {
      get: {
        tags: ["System"], operationId: "getReadiness", summary: "Check API and database readiness",
        responses: {
          "200": json("API and database are ready", { type: "object", additionalProperties: true }),
          "503": json("A required dependency is unavailable", { type: "object", additionalProperties: true })
        }
      }
    },
    "/telemetry/client-errors": {
      post: {
        tags: ["System"], operationId: "reportClientError", summary: "Report a sanitized browser error signal",
        description: "Accepts technical metadata only; messages, stack traces, URLs with query strings, and user data are rejected.",
        requestBody: body({
          type: "object", additionalProperties: false,
          required: ["kind", "source", "line", "column"],
          properties: {
            kind: { type: "string", enum: ["error", "unhandledrejection"] },
            source: { type: "string", maxLength: 120, pattern: "^(\\/[-a-zA-Z0-9._/]*|inline|external)$" },
            line: { type: ["integer", "null"], minimum: 0, maximum: 1000000 },
            column: { type: ["integer", "null"], minimum: 0, maximum: 1000000 }
          }
        }),
        responses: { "202": json("Signal accepted", { type: "object", additionalProperties: true }), ...validationError, "429": { $ref: "#/components/responses/RateLimited" } }
      }
    },
    "/profile": {
      get: secured({
        tags: ["Account"], operationId: "getProfile", summary: "Get the private diver profile",
        responses: { "200": json("Private profile", ref("ProfileEnvelope")), ...bearerErrors }
      }),
      put: secured({
        tags: ["Account"], operationId: "updateProfile", summary: "Update experience and sharing preference",
        requestBody: body(ref("ProfileInput")),
        responses: { "200": json("Profile updated", ref("ProfileEnvelope")), ...validationError, ...bearerErrors }
      })
    },
    "/profile/photo": {
      get: secured({
        tags: ["Account"], operationId: "getProfilePhoto", summary: "Read the private profile photo",
        responses: { "200": { description: "Private image bytes", content: { "image/jpeg": { schema: { type: "string", format: "binary" } }, "image/png": { schema: { type: "string", format: "binary" } }, "image/webp": { schema: { type: "string", format: "binary" } } } }, ...bearerErrors }
      }),
      put: secured({
        tags: ["Account"], operationId: "putProfilePhoto", summary: "Create or replace the private profile photo",
        requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", required: ["photo"], properties: { photo: { type: "string", format: "binary" } } } } } },
        responses: { "200": json("Profile photo updated", ref("ProfileEnvelope")), ...validationError, ...bearerErrors }
      }),
      delete: secured({
        tags: ["Account"], operationId: "deleteProfilePhoto", summary: "Delete the private profile photo",
        responses: { "204": { description: "Profile photo deleted" }, ...bearerErrors }
      })
    },
    "/auth/register": {
      post: {
        tags: ["Authentication"], operationId: "registerUser", summary: "Create an account",
        requestBody: body(ref("RegisterInput")),
        responses: { "201": json("Account created", ref("UserEnvelope")), ...validationError, "409": { $ref: "#/components/responses/Conflict" } }
      }
    },
    "/auth/login": {
      post: {
        tags: ["Authentication"], operationId: "loginUser", summary: "Exchange credentials for a JWT",
        requestBody: body(ref("LoginInput")),
        responses: { "200": json("Authenticated", ref("LoginEnvelope")), ...validationError, "401": { $ref: "#/components/responses/Unauthorized" }, "429": { $ref: "#/components/responses/RateLimited" } }
      }
    },
    "/auth/refresh": {
      post: {
        tags: ["Authentication"], operationId: "refreshSession", summary: "Rotate the refresh token and issue a new access token",
        description: "Requires the httpOnly refresh cookie plus the matching CSRF cookie value in X-CSRF-Token.",
        security: [{ refreshCookie: [] }],
        parameters: [{ $ref: "#/components/parameters/CsrfHeader" }],
        responses: { "200": json("Session rotated", ref("LoginEnvelope")), "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" }, "429": { $ref: "#/components/responses/RateLimited" } }
      }
    },
    "/auth/logout": {
      post: {
        tags: ["Authentication"], operationId: "logoutSession", summary: "Revoke the current session family",
        security: [{ refreshCookie: [] }], parameters: [{ $ref: "#/components/parameters/CsrfHeader" }],
        responses: { "204": { description: "Session revoked and cookies cleared" }, "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" } }
      }
    },
    "/auth/logout-all": {
      post: secured({
        tags: ["Authentication"], operationId: "logoutAllSessions", summary: "Revoke all sessions for the current user",
        description: "Requires Bearer authentication, refresh cookie and CSRF header.",
        parameters: [{ $ref: "#/components/parameters/CsrfHeader" }],
        responses: { "204": { description: "All sessions revoked and cookies cleared" }, "401": { $ref: "#/components/responses/Unauthorized" }, "403": { $ref: "#/components/responses/Forbidden" } }
      })
    },
    "/auth/forgot-password": {
      post: {
        tags: ["Authentication"], operationId: "requestPasswordReset", summary: "Request password recovery",
        description: "Always returns the same message to prevent account enumeration. Development may also return resetToken.",
        requestBody: body({ type: "object", additionalProperties: false, required: ["email"], properties: { email: { type: "string", format: "email", maxLength: 254 } } }),
        responses: { "200": json("Request accepted", ref("MessageEnvelope")), ...validationError, "429": { $ref: "#/components/responses/RateLimited" } }
      }
    },
    "/auth/reset-password": {
      post: {
        tags: ["Authentication"], operationId: "resetPassword", summary: "Set a new password",
        requestBody: body({ type: "object", additionalProperties: false, required: ["token", "password"], properties: { token: { type: "string", minLength: 64, maxLength: 64 }, password: { $ref: "#/components/schemas/Password" } } }),
        responses: { "204": { description: "Password changed" }, ...validationError }
      }
    },
    "/auth/me": {
      get: secured({ tags: ["Authentication"], operationId: "getCurrentUser", summary: "Get current account", responses: { "200": json("Current account", ref("UserEnvelope")), ...bearerErrors } })
    },
    "/dives": {
      post: secured({ tags: ["Dives"], operationId: "createDive", summary: "Create a dive", requestBody: body(ref("DiveInput")), responses: { "201": json("Dive created", ref("DiveEnvelope")), ...validationError, ...bearerErrors } }),
      get: secured({
        tags: ["Dives"], operationId: "listDives", summary: "List and filter dives",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          { name: "dateFrom", in: "query", schema: { type: "string", format: "date" } },
          { name: "dateTo", in: "query", schema: { type: "string", format: "date" } },
          { name: "diveCenter", in: "query", schema: { type: "string", maxLength: 120 } },
          { name: "minDepth", in: "query", schema: { type: "number", exclusiveMinimum: 0, maximum: 150 } },
          { name: "maxDepth", in: "query", schema: { type: "number", exclusiveMinimum: 0, maximum: 150 } }
        ],
        responses: { "200": json("Paginated dives", ref("DiveListEnvelope")), ...validationError, ...bearerErrors }
      })
    },
    "/dives/stats": {
      get: secured({ tags: ["Dives"], operationId: "getDiveStats", summary: "Get dashboard statistics", responses: { "200": json("Aggregated statistics", ref("StatsEnvelope")), ...bearerErrors } })
    },
    "/dives/insights": {
      get: secured({ tags: ["Dives"], operationId: "getDiveInsights", summary: "Get descriptive personal insights", responses: { "200": json("Personal insights", { type: "object", required: ["data"], properties: { data: { type: "object", required: ["insights"], properties: { insights: { type: "object", additionalProperties: true } } } } }), ...bearerErrors } })
    },
    "/dives/map": {
      get: secured({ tags: ["Dives"], operationId: "getDiveMap", summary: "List private dive locations for the authenticated user", responses: { "200": json("Private map locations", { type: "object", properties: { data: { type: "object", properties: { dives: { type: "array", items: ref("DiveMapPoint") } } } } }), "401": { $ref: "#/components/responses/Unauthorized" } } })
    },
    "/dives/configuration-memory": {
      get: secured({
        tags: ["Dives"], operationId: "getConfigurationMemory", summary: "Find past dives with matching equipment",
        parameters: [
          { name: "waterType", in: "query", schema: { type: "string", enum: ["salt", "fresh"] } },
          { name: "suitType", in: "query", schema: { type: "string", enum: ["wetsuit", "drysuit", "shorty", "none"] } },
          { name: "suitThicknessMm", in: "query", schema: { type: "number", minimum: 0, maximum: 15 } },
          { name: "cylinderMaterial", in: "query", schema: { type: "string", enum: ["steel", "aluminum"] } },
          { name: "cylinderVolumeLiters", in: "query", schema: { type: "number", minimum: 3, maximum: 20 } },
          { name: "excludeDiveId", in: "query", schema: { type: "integer", minimum: 1 } }
        ],
        responses: { "200": json("Matching dives", { type: "object", required: ["data"], properties: { data: { type: "object", properties: { dives: { type: "array", items: ref("Dive") } } } } }), ...validationError, ...bearerErrors }
      })
    },
    "/dives/{diveId}": {
      parameters: [idParameter("diveId")],
      get: secured({ tags: ["Dives"], operationId: "getDive", summary: "Get one dive", responses: { "200": json("Dive found", ref("DiveEnvelope")), ...validationError, ...bearerErrors } }),
      put: secured({ tags: ["Dives"], operationId: "updateDive", summary: "Replace a dive", requestBody: body(ref("DiveInput")), responses: { "200": json("Dive updated", ref("DiveEnvelope")), ...validationError, ...bearerErrors } }),
      delete: secured({ tags: ["Dives"], operationId: "deleteDive", summary: "Delete a dive and its private data", responses: { "204": { description: "Dive deleted" }, ...validationError, ...bearerErrors } })
    },
    "/dives/{diveId}/reflection": {
      parameters: [idParameter("diveId")],
      put: secured({ tags: ["Dives"], operationId: "saveDiveReflection", summary: "Create or replace a private reflection", requestBody: body(ref("ReflectionInput")), responses: { "200": json("Reflection saved", ref("DiveEnvelope")), ...validationError, ...bearerErrors } }),
      delete: secured({ tags: ["Dives"], operationId: "deleteDiveReflection", summary: "Delete a private reflection", responses: { "204": { description: "Reflection deleted" }, ...validationError, ...bearerErrors } })
    },
    "/dives/{diveId}/photos": {
      parameters: [idParameter("diveId")],
      post: secured({
        tags: ["Dives"], operationId: "uploadDivePhotos", summary: "Upload private dive photos",
        requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", required: ["photos"], properties: { photos: { type: "array", maxItems: 5, items: { type: "string", format: "binary" } } } } } } },
        responses: { "201": json("Photos stored", ref("PhotoListEnvelope")), ...validationError, ...bearerErrors }
      })
    },
    "/dives/{diveId}/photos/{photoId}/content": {
      parameters: [idParameter("diveId"), idParameter("photoId")],
      get: secured({ tags: ["Dives"], operationId: "getDivePhotoContent", summary: "Read a private photo", responses: { "200": { description: "Image bytes", content: { "image/jpeg": { schema: { type: "string", format: "binary" } }, "image/png": { schema: { type: "string", format: "binary" } }, "image/webp": { schema: { type: "string", format: "binary" } } } }, ...validationError, ...bearerErrors } })
    },
    "/dives/{diveId}/photos/{photoId}": {
      parameters: [idParameter("diveId"), idParameter("photoId")],
      delete: secured({ tags: ["Dives"], operationId: "deleteDivePhoto", summary: "Delete a private photo", responses: { "204": { description: "Photo deleted" }, ...validationError, ...bearerErrors } })
    },
    "/dives/{diveId}/shares": {
      parameters: [idParameter("diveId")],
      post: secured({ tags: ["Sharing"], operationId: "createDiveShare", summary: "Create an expiring share and QR", requestBody: body(ref("CreateShareInput")), responses: { "201": json("Share created", { type: "object", additionalProperties: true }), ...validationError, ...bearerErrors } }),
      get: secured({ tags: ["Sharing"], operationId: "listDiveShares", summary: "List shares for a dive", responses: { "200": json("Shares", { type: "object", additionalProperties: true }), ...validationError, ...bearerErrors } })
    },
    "/dives/{diveId}/shares/{shareId}": {
      parameters: [idParameter("diveId"), idParameter("shareId")],
      delete: secured({ tags: ["Sharing"], operationId: "revokeDiveShare", summary: "Revoke a share", responses: { "204": { description: "Share revoked" }, ...validationError, ...bearerErrors } })
    },
    "/public/dives/{token}": {
      parameters: [tokenParameter],
      get: { tags: ["Sharing"], operationId: "getPublicDive", summary: "Read data allowed by a share", description: "Password-protected shares accept their temporary scoped Bearer token.", responses: { "200": json("Public dive projection", { type: "object", additionalProperties: true }), "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" }, "410": { $ref: "#/components/responses/Gone" }, "429": { $ref: "#/components/responses/RateLimited" } } }
    },
    "/public/dives/{token}/access": {
      parameters: [tokenParameter],
      post: { tags: ["Sharing"], operationId: "unlockPublicDive", summary: "Unlock a password-protected share", requestBody: body({ type: "object", additionalProperties: false, required: ["password"], properties: { password: { type: "string", minLength: 8, maxLength: 64 } } }), responses: { "200": json("Scoped access token", { type: "object", additionalProperties: true }), ...validationError, "401": { $ref: "#/components/responses/Unauthorized" }, "410": { $ref: "#/components/responses/Gone" }, "429": { $ref: "#/components/responses/RateLimited" } } }
    },
    "/public/dives/{token}/photos/{position}/content": {
      parameters: [tokenParameter, { name: "position", in: "path", required: true, schema: { type: "integer", minimum: 1, maximum: 5 } }],
      get: { tags: ["Sharing"], operationId: "getPublicDivePhoto", summary: "Read an allowed shared photo", responses: { "200": { description: "Image bytes", content: { "image/jpeg": { schema: { type: "string", format: "binary" } }, "image/png": { schema: { type: "string", format: "binary" } }, "image/webp": { schema: { type: "string", format: "binary" } } } }, "401": { $ref: "#/components/responses/Unauthorized" }, "404": { $ref: "#/components/responses/NotFound" }, "410": { $ref: "#/components/responses/Gone" } } }
    },
    "/account/export.json": {
      get: secured({ tags: ["Account"], operationId: "exportAccountJson", summary: "Download the canonical account export", responses: { "200": { description: "Versioned JSON export", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } }, ...bearerErrors } })
    },
    "/account/export.csv": {
      get: secured({ tags: ["Account"], operationId: "exportAccountCsv", summary: "Download dives as UTF-8 CSV", responses: { "200": { description: "CSV export", content: { "text/csv": { schema: { type: "string" } } } }, ...bearerErrors } })
    },
    "/account/export.zip": {
      get: secured({ tags: ["Account"], operationId: "exportAccountArchive", summary: "Download data and photos", responses: { "200": { description: "ZIP archive", content: { "application/zip": { schema: { type: "string", format: "binary" } } } }, ...bearerErrors } })
    },
    "/account": {
      delete: secured({ tags: ["Account"], operationId: "deleteAccount", summary: "Permanently delete the current account", requestBody: body({ type: "object", additionalProperties: false, required: ["password", "confirmation"], properties: { password: { type: "string", minLength: 8, maxLength: 72 }, confirmation: { const: "ELIMINAR" } } }), responses: { "204": { description: "Account deleted" }, ...validationError, ...bearerErrors } })
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      refreshCookie: { type: "apiKey", in: "cookie", name: "deeplog_refresh" }
    },
    parameters: {
      CsrfHeader: { name: "X-CSRF-Token", in: "header", required: true, schema: { type: "string", minLength: 64, maxLength: 64 } }
    },
    responses: {
      ValidationError: json("Request validation failed", ref("ErrorEnvelope"), { error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: [{ field: "email", message: "Invalid email" }] } }),
      Unauthorized: json("Authentication failed", ref("ErrorEnvelope")),
      Forbidden: json("CSRF validation failed", ref("ErrorEnvelope")),
      NotFound: json("Resource not found or not owned by the caller", ref("ErrorEnvelope")),
      Conflict: json("Resource conflicts with current state", ref("ErrorEnvelope")),
      Gone: json("Share expired or was revoked", ref("ErrorEnvelope")),
      RateLimited: json("Too many requests", ref("ErrorEnvelope"))
    },
    schemas: {
      Password: { type: "string", minLength: 8, maxLength: 72, pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).+$", writeOnly: true },
      RegisterInput: { type: "object", additionalProperties: false, required: ["firstName", "lastName", "email", "password"], properties: { firstName: { type: "string", minLength: 2, maxLength: 50 }, lastName: { type: "string", minLength: 2, maxLength: 80 }, secondLastName: { type: "string", maxLength: 80 }, email: { type: "string", format: "email", maxLength: 254 }, password: ref("Password") } },
      LoginInput: { type: "object", additionalProperties: false, required: ["email", "password"], properties: { email: { type: "string", format: "email", maxLength: 254 }, password: { type: "string", minLength: 1, maxLength: 72, writeOnly: true } } },
      User: { type: "object", required: ["id", "firstName", "lastName", "email", "createdAt", "updatedAt"], properties: { id: { type: "integer" }, firstName: { type: "string" }, lastName: { type: "string" }, secondLastName: { type: ["string", "null"] }, email: { type: "string", format: "email" }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } },
      UserEnvelope: { type: "object", required: ["data"], properties: { data: { type: "object", required: ["user"], properties: { user: ref("User") } } } },
      LoginEnvelope: { type: "object", required: ["data"], properties: { data: { type: "object", required: ["user", "accessToken", "tokenType", "expiresIn"], properties: { user: ref("User"), accessToken: { type: "string" }, tokenType: { const: "Bearer" }, expiresIn: { type: "string", example: "15m" } } } } },
      MessageEnvelope: { type: "object", required: ["data"], properties: { data: { type: "object", required: ["message"], properties: { message: { type: "string" }, resetToken: { type: "string", description: "Development only" } } } } },
      ProfileInput: { type: "object", additionalProperties: false, required: ["shareNameByDefault"], properties: { bio: { type: ["string", "null"], maxLength: 500 }, certificationLevel: { type: ["string", "null"], enum: ["beginner", "open_water", "advanced", "rescue", "divemaster", "instructor", null] }, divingSince: { type: ["integer", "null"], minimum: 1950 }, shareNameByDefault: { type: "boolean" } } },
      Profile: { allOf: [ref("ProfileInput"), { type: "object", required: ["photoUrl"], properties: { photoUrl: { type: ["string", "null"] }, updatedAt: { type: ["string", "null"], format: "date-time" } } }] },
      ProfileEnvelope: { type: "object", required: ["data"], properties: { data: { type: "object", required: ["profile"], properties: { profile: ref("Profile") } } } },
      DiveInput: { type: "object", additionalProperties: false, required: ["name", "date", "durationMinutes", "maxDepthMeters"], properties: { name: { type: "string", minLength: 2, maxLength: 100 }, date: { type: "string", format: "date", description: "Cannot be in the future" }, durationMinutes: { type: "integer", minimum: 1, maximum: 300 }, maxDepthMeters: { type: "number", exclusiveMinimum: 0, maximum: 150, multipleOf: 0.01 }, ballastKg: { type: "number", minimum: 0, maximum: 20, multipleOf: 0.01 }, equipmentOwnership: { type: "string", enum: ["owned", "rented"] }, suitType: { type: "string", enum: ["wetsuit", "drysuit", "shorty", "none"] }, suitThicknessMm: { type: "number", minimum: 0, maximum: 15, multipleOf: 0.1 }, cylinderMaterial: { type: "string", enum: ["steel", "aluminum"] }, cylinderVolumeLiters: { type: "number", minimum: 3, maximum: 20, multipleOf: 0.1 }, waterType: { type: "string", enum: ["salt", "fresh"] }, buddies: { type: "array", maxItems: 10, default: [], items: { type: "string", minLength: 2, maxLength: 80 } }, diveCenter: { type: "string", maxLength: 120 }, comments: { type: "string", maxLength: 5000 } } },
      ReflectionInput: { type: "object", additionalProperties: false, description: "At least one non-empty text field is required", properties: { wentWell: { type: ["string", "null"], maxLength: 2000 }, improveNext: { type: ["string", "null"], maxLength: 2000 }, practicedSkill: { type: ["string", "null"], maxLength: 120 }, comfort: { type: ["string", "null"], enum: ["comfortable", "mixed", "challenging", null] }, incidents: { type: ["string", "null"], maxLength: 2000 }, nextGoal: { type: ["string", "null"], maxLength: 500 } } },
      Reflection: { allOf: [ref("ReflectionInput"), { type: "object", properties: { createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } }] },
      Photo: { type: "object", required: ["id", "originalName", "mimeType", "sizeBytes", "url", "createdAt"], properties: { id: { type: "integer" }, originalName: { type: "string" }, mimeType: { type: "string", enum: ["image/jpeg", "image/png", "image/webp"] }, sizeBytes: { type: "integer" }, url: { type: "string" }, createdAt: { type: "string", format: "date-time" } } },
      Dive: { allOf: [ref("DiveInput"), { type: "object", required: ["id", "buddies", "photos", "createdAt", "updatedAt"], properties: { id: { type: "integer" }, ballastKg: { type: ["number", "null"] }, buddies: { type: "array", items: { type: "string" } }, photos: { type: "array", items: ref("Photo") }, reflection: { oneOf: [ref("Reflection"), { type: "null" }] }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } } }] },
      DiveEnvelope: { type: "object", required: ["data"], properties: { data: { type: "object", required: ["dive"], properties: { dive: ref("Dive") } } } },
      DiveListEnvelope: { type: "object", required: ["data", "meta"], properties: { data: { type: "object", properties: { dives: { type: "array", items: ref("Dive") } } }, meta: { type: "object", required: ["page", "limit", "total", "totalPages"], properties: { page: { type: "integer" }, limit: { type: "integer" }, total: { type: "integer" }, totalPages: { type: "integer" } } } } },
      DiveMapPoint: {"type": "object", "required": ["id", "name", "date", "latitude", "longitude", "precision"], "properties": {"id": {"type": "integer"}, "name": {"type": "string"}, "date": {"type": "string", "format": "date"}, "latitude": {"type": "number", "minimum": -90, "maximum": 90}, "longitude": {"type": "number", "minimum": -180, "maximum": 180}, "precision": {"type": "string", "enum": ["exact", "approximate"]}}},
      StatsEnvelope: { type: "object", required: ["data"], properties: { data: { type: "object", properties: { stats: { type: "object", required: ["totalDives", "totalMinutes", "monthlyActivity"], properties: { totalDives: { type: "integer" }, totalMinutes: { type: "integer" }, maxDepthMeters: { type: ["number", "null"] }, averageDepthMeters: { type: ["number", "null"] }, longestDurationMinutes: { type: ["integer", "null"] }, divesThisYear: { type: "integer" }, favoriteCenter: { type: ["object", "null"], additionalProperties: true }, monthlyActivity: { type: "array", items: { type: "object", additionalProperties: true } } } } } } } },
      PhotoListEnvelope: { type: "object", required: ["data"], properties: { data: { type: "object", properties: { photos: { type: "array", items: ref("Photo") } } } } },
      CreateShareInput: { type: "object", additionalProperties: false, properties: { visibility: { type: "object", additionalProperties: false, properties: { includeDiverName: { type: "boolean", default: true }, includeCenter: { type: "boolean", default: true }, includeEquipment: { type: "boolean", default: true }, includeBuddies: { type: "boolean", default: true }, includeComments: { type: "boolean", default: true }, photoIds: { type: "array", maxItems: 5, items: { type: "integer", minimum: 1 } } } }, expiresInDays: { type: ["integer", "null"], enum: [1, 7, 30, null], default: 7 }, password: { type: "string", minLength: 8, maxLength: 64, writeOnly: true } } },
      ErrorDetail: { type: "object", required: ["field", "message"], properties: { field: { type: "string" }, message: { type: "string" } } },
      ErrorEnvelope: { type: "object", required: ["error"], properties: { error: { type: "object", required: ["code", "message"], properties: { code: { type: "string" }, message: { type: "string" }, details: { type: "array", items: ref("ErrorDetail") } } } } }
    }
  }
};

const output = path.join(__dirname, "..", "openapi.json");
fs.writeFileSync(output, `${JSON.stringify(spec, null, 2)}\n`);
