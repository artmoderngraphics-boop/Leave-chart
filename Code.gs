/*************************************************
 * Leave Chart backend — Google Drive JSON store
 * 1. Paste this whole file into Apps Script (Code.gs)
 * 2. Set WRITE_SECRET below (long random text)
 * 3. Deploy → New deployment → Web app
 *    Execute as: Me | Who has access: Anyone
 * 4. Copy the /exec URL into the app (📄 Google)
 *************************************************/
const FILE_NAME = "leave-chart-data.json";
const WRITE_SECRET = "Le951753Ve";

function doGet() {
  try {
    const f = getFile_();
    if (!f) return out_({ ok: false, error: "empty" });
    const data = JSON.parse(f.getBlob().getDataAsString());
    return out_({
      ok: true,
      updatedAt: data.updatedAt || null,
      staff: data.staff || [],
      leaves: data.leaves || [],
      holidays: data.holidays || []
    });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const body = JSON.parse(((e && e.postData) || {}).contents || "{}");
    if (body.action !== "write") return out_({ ok: false, error: "bad-action" });
    if (!WRITE_SECRET || body.secret !== WRITE_SECRET) return out_({ ok: false, error: "forbidden" });
    if (!Array.isArray(body.staff) || !Array.isArray(body.leaves)) return out_({ ok: false, error: "bad-data" });
    const payload = {
      app: "leave-chart",
      version: 1,
      updatedAt: body.updatedAt || new Date().toISOString(),
      staff: body.staff,
      leaves: body.leaves,
      holidays: Array.isArray(body.holidays) ? body.holidays : [],
      schedules: Array.isArray(body.schedules) ? body.schedules : []
    };
    saveFile_(JSON.stringify(payload, null, 2));
    return out_({ ok: true, updatedAt: payload.updatedAt });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function getFile_() {
  const it = DriveApp.getFilesByName(FILE_NAME);
  return it.hasNext() ? it.next() : null;
}

function saveFile_(text) {
  const f = getFile_();
  if (f) f.setContent(text);
  else DriveApp.createFile(FILE_NAME, text, MimeType.PLAIN_TEXT);
}
