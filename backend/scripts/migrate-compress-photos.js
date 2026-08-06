/**
 * migrate-compress-photos.js
 *
 * Compresses existing photos in Supabase storage using sharp.
 * Process one user folder at a time for safety.
 *
 * Usage:
 *   --backup-only            Download all prod photos to PC (read-only, zero risk)
 *   --folder 61              Process only user folder 61 (can be comma-separated: 61,62,63)
 *   --run                    Actually compress and re-upload (default is dry run)
 *   --restore --folder 61    Restore folder 61 from local PC backup back to prod
 *
 * Examples:
 *   node backend/scripts/migrate-compress-photos.js --backup-only
 *   node backend/scripts/migrate-compress-photos.js --folder 61              (dry run, see sizes)
 *   node backend/scripts/migrate-compress-photos.js --folder 61 --run        (compress user 61)
 *   node backend/scripts/migrate-compress-photos.js --folder 43,45,46 --run  (compress next batch)
 *   node backend/scripts/migrate-compress-photos.js --restore --folder 61    (rollback user 61)
 */

const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const args         = process.argv.slice(2);
const DRY_RUN      = !args.includes('--run') && !args.includes('--backup-only') && !args.includes('--restore');
const BACKUP_ONLY  = args.includes('--backup-only');
const RESTORE_MODE = args.includes('--restore');
const FOLDER_ARG   = args.includes('--folder') ? args[args.indexOf('--folder') + 1] : null;
const TARGET_FOLDERS = FOLDER_ARG ? FOLDER_ARG.split(',').map(f => f.trim()) : null;

const SKIP_BELOW_KB = 300; // skip photos already under this size (already compressed)
const BACKUP_DIR    = path.join(__dirname, '../backups/photos-prod');

require('dotenv').config({ path: path.join(__dirname, '../.env.production') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET       = 'service-photos';

if (!SUPABASE_URL || !SERVICE_KEY || SERVICE_KEY.startsWith('your-')) {
  console.error('❌  Missing credentials in backend/.env.production');
  console.error('    Supabase Dashboard → project aorpdijxljwnxggjnofx → Settings → API → service_role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────

function kb(bytes) { return (bytes / 1024).toFixed(0) + ' KB'; }
function pct(orig, comp) { return Math.round((1 - comp / orig) * 100) + '%'; }

// ── Restore mode ──────────────────────────────────────────────────────────────

async function restore() {
  if (!TARGET_FOLDERS) {
    console.error('❌  --restore requires --folder. Example: --restore --folder 61');
    process.exit(1);
  }
  console.log(`\n♻️   RESTORE MODE — re-uploading originals from PC backup to prod`);
  console.log(`    Folders: ${TARGET_FOLDERS.join(', ')}\n`);

  for (const userId of TARGET_FOLDERS) {
    const localFolder = path.join(BACKUP_DIR, userId);
    if (!fs.existsSync(localFolder)) {
      console.error(`❌  No backup found for user ${userId} at ${localFolder}`);
      continue;
    }
    const files = fs.readdirSync(localFolder);
    console.log(`📁  user ${userId}: restoring ${files.length} photo(s)`);
    for (const filename of files) {
      const filePath = path.join(localFolder, filename);
      const buffer = fs.readFileSync(filePath);
      const storagePath = `${userId}/${filename}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });
      if (error) console.error(`   ❌  ${storagePath}: ${error.message}`);
      else       console.log(`   ✅  Restored ${storagePath} (${kb(buffer.length)})`);
    }
  }
  console.log('\n✅  Restore complete.');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  if (RESTORE_MODE) return restore();

  console.log(`\n🌐  Target : PROD (${SUPABASE_URL})`);
  if (BACKUP_ONLY)        console.log(`💾  Mode   : BACKUP ONLY → ${BACKUP_DIR}\n`);
  else if (DRY_RUN)       console.log(`🔍  Mode   : DRY RUN — nothing will change. Add --run to apply.\n`);
  else                    console.log(`🚀  Mode   : LIVE — compressing and re-uploading\n`);

  if (TARGET_FOLDERS)     console.log(`🎯  Folders: ${TARGET_FOLDERS.join(', ')}\n`);
  else                    console.log(`🎯  Folders: ALL\n`);

  // 1. List user-id folders
  const { data: folders, error: folderErr } = await supabase.storage
    .from(BUCKET).list('', { limit: 1000 });

  if (folderErr) { console.error('❌  Cannot list bucket:', folderErr.message); process.exit(1); }

  const userFolders = folders
    .filter(f => f.id === null)
    .filter(f => !TARGET_FOLDERS || TARGET_FOLDERS.includes(f.name));

  if (userFolders.length === 0) {
    console.error(`❌  No matching folders found. Available: ${folders.filter(f=>f.id===null).map(f=>f.name).join(', ')}`);
    process.exit(1);
  }

  console.log(`Found ${userFolders.length} folder(s): ${userFolders.map(f => f.name).join(', ')}\n`);

  let processed = 0, skipped = 0, failed = 0;
  let origBytes = 0, compBytes = 0;

  for (const folder of userFolders) {
    const userId = folder.name;

    const { data: files, error: fileErr } = await supabase.storage
      .from(BUCKET).list(userId, { limit: 1000 });

    if (fileErr) { console.error(`❌  Cannot list ${userId}:`, fileErr.message); continue; }

    const imageFiles = files.filter(f => f.id !== null);
    console.log(`📁  user ${userId}: ${imageFiles.length} photo(s)`);

    for (const file of imageFiles) {
      const storagePath = `${userId}/${file.name}`;

      try {
        // Download
        const { data: blob, error: dlErr } = await supabase.storage
          .from(BUCKET).download(storagePath);
        if (dlErr) throw new Error('Download: ' + dlErr.message);

        const originalBuffer = Buffer.from(await blob.arrayBuffer());
        origBytes += originalBuffer.length;

        // Always save to local backup folder
        const localFolder = path.join(BACKUP_DIR, userId);
        fs.mkdirSync(localFolder, { recursive: true });
        fs.writeFileSync(path.join(localFolder, file.name), originalBuffer);

        if (BACKUP_ONLY) {
          console.log(`   💾  ${storagePath} (${kb(originalBuffer.length)})`);
          processed++;
          continue;
        }

        // Skip already-small photos
        if (originalBuffer.length < SKIP_BELOW_KB * 1024) {
          console.log(`   ⏭️   ${storagePath}: ${kb(originalBuffer.length)} — already small, skipping`);
          skipped++;
          continue;
        }

        // Some files were stored with a corrupted prefix (data URL garbage bytes
        // prepended before the real JPEG). Detect and strip by finding the JPEG
        // magic bytes FF D8 FF which mark the true start of the image.
        let imageBuffer = originalBuffer;
        const jpegMagic = Buffer.from([0xFF, 0xD8, 0xFF]);
        const jpegStart = originalBuffer.indexOf(jpegMagic);
        if (jpegStart > 0) {
          imageBuffer = originalBuffer.slice(jpegStart);
          console.log(`   🔧  Stripped ${jpegStart} corrupt prefix bytes`);
        }

        // Compress
        let compressed;
        try {
          compressed = await sharp(imageBuffer)
            .rotate()
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 70 })
            .toBuffer();
        } catch {
          // Retry without .rotate() in case EXIF causes bad seek
          compressed = await sharp(imageBuffer)
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 70 })
            .toBuffer();
          console.warn(`   ⚠️  Compressed without EXIF rotation`);
        }

        compBytes += compressed.length;
        const summary = `${storagePath}: ${kb(originalBuffer.length)} → ${kb(compressed.length)} (${pct(originalBuffer.length, compressed.length)} smaller)`;

        if (DRY_RUN) {
          console.log(`   🔍  ${summary}`);
          processed++;
          continue;
        }

        // Re-upload
        const { error: upErr } = await supabase.storage
          .from(BUCKET).upload(storagePath, compressed, { contentType: 'image/jpeg', upsert: true });
        if (upErr) throw new Error('Upload: ' + upErr.message);

        console.log(`   ✅  ${summary}`);
        processed++;

      } catch (err) {
        console.error(`   ❌  ${storagePath}: ${err.message}`);
        failed++;
      }
    }
    console.log('');
  }

  // Summary
  console.log('══════════════════════════════════════════════════════');
  const label = BACKUP_ONLY ? 'BACKUP COMPLETE' : DRY_RUN ? 'DRY RUN COMPLETE' : 'MIGRATION COMPLETE';
  console.log(label);
  console.log(`  Processed : ${processed}  |  Skipped: ${skipped}  |  Failed: ${failed}`);
  if (origBytes > 0 && !BACKUP_ONLY) {
    console.log(`  Size      : ${kb(origBytes)} → ${kb(compBytes)} (${pct(origBytes, compBytes)} smaller)`);
  }
  console.log(`  Backup    : ${BACKUP_DIR}`);
  console.log('══════════════════════════════════════════════════════');
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
