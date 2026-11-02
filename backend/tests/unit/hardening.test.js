const { test } = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const { sanitizeImage } = require("../../src/utils/image-sanitizer");
const { createShareSchema } = require("../../src/validations/dive-share.validation");
const { createDiveSchema } = require("../../src/validations/dive.validation");
const { writeCsv } = require("../../src/services/account-export.service");

async function phonePhotoWithGps() {
  // Minimal EXIF block with GPS coordinates and a rotation tag, like a phone photo.
  return sharp({ create: { width: 40, height: 20, channels: 3, background: "#1188aa" } })
    .jpeg()
    .withExifMerge({
      IFD0: { Make: "Apple", Model: "iPhone 15 Pro" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "41/1 42/1 756/100", GPSLongitudeRef: "E", GPSLongitude: "2/1 59/1 4056/100" }
    })
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

test("uploaded photos lose GPS and device metadata but keep their orientation", async () => {
  const original = await phonePhotoWithGps();
  const before = await sharp(original).metadata();
  assert.ok(before.exif.includes("iPhone 15 Pro"), "fixture should contain device EXIF");
  assert.equal(before.orientation, 6);

  const clean = await sanitizeImage(original, "image/jpeg");
  const metadata = await sharp(clean).metadata();

  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.xmp, undefined);
  assert.equal(metadata.format, "jpeg");
  // Orientation 6 means "rotate 90°": the pixels are rotated before the tag is dropped.
  assert.deepEqual([metadata.width, metadata.height], [20, 40]);
});

test("files that are not decodable images are rejected", async () => {
  const fake = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from("not really a jpeg")]);
  await assert.rejects(sanitizeImage(fake, "image/jpeg"));
});

test("share links hide the diver name unless the owner opts in", () => {
  assert.equal(createShareSchema.parse({}).visibility.includeDiverName, false);
  assert.equal(createShareSchema.parse({ visibility: {} }).visibility.includeDiverName, false);
});

test("a dive dated today is accepted in time zones ahead of UTC", () => {
  const aheadOfUtc = new Date(Date.now() + 13 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const farFuture = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const base = { name: "Night dive", durationMinutes: 30, maxDepthMeters: 10 };

  assert.equal(createDiveSchema.safeParse({ ...base, date: aheadOfUtc }).success, true);
  assert.equal(createDiveSchema.safeParse({ ...base, date: farFuture }).success, false);
});

test("CSV export neutralises spreadsheet formulas but keeps negative numbers", async () => {
  const { PassThrough } = require("node:stream");
  const accountRepository = require("../../src/repositories/account.repository");
  const original = accountRepository.findDiveBatch;
  let served = false;
  accountRepository.findDiveBatch = async () => {
    if (served) return [];
    served = true;
    return [{
      id: 1, name: "=HYPERLINK(\"http://evil\")", dive_date: "2026-01-01", duration_minutes: 30,
      max_depth_meters: "10", ballast_kg: null, equipment_ownership: null, suit_type: null,
      suit_thickness_mm: null, cylinder_material: null, cylinder_volume_liters: null,
      water_type: null, dive_center: "@SUM(1)", latitude: "-3.70379", longitude: "-0.5",
      location_precision: "exact", buddies: ["+34 600 000 000"], comments: "-ok",
      reflection: null, photos: [], created_at: "2026-01-01", updated_at: "2026-01-01"
    }];
  };

  const stream = new PassThrough();
  let csv = "";
  stream.on("data", (chunk) => { csv += chunk; });
  try {
    await writeCsv(stream, 1);
  } finally {
    accountRepository.findDiveBatch = original;
  }

  const row = csv.trim().split("\r\n")[1];
  assert.match(row, /"'=HYPERLINK\(""http:\/\/evil""\)"/);
  assert.match(row, /'@SUM\(1\)/);
  assert.match(row, /'\+34 600 000 000/);
  assert.match(row, /,-3\.70379,-0\.5,/);
});
