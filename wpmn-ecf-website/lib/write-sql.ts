// Execute guard + writes + clearGuard in ONE D1 batch. A CHECK failure rolls
// the batch back; a conditional update affecting zero rows does not.
export const settingsGuard = `INSERT INTO write_guards (id, valid)
SELECT ?, CASE WHEN EXISTS (
 SELECT 1 FROM json_each(?) AS change
 LEFT JOIN settings s ON s.key = json_extract(change.value, '$.key')
 WHERE COALESCE(s.version, 0) != json_extract(change.value, '$.version')
) THEN 0 ELSE 1 END`;
export const recordGuard = `INSERT INTO write_guards (id, valid)
VALUES (?, CASE WHEN COALESCE((SELECT version FROM records WHERE id = ?), 0) = ? THEN 1 ELSE 0 END)`;
export const submissionGuard = `INSERT INTO write_guards (id, valid)
VALUES (?, CASE WHEN EXISTS(SELECT 1 FROM submissions WHERE id = ?) THEN 1 ELSE 0 END)`;
export const clearGuard = 'DELETE FROM write_guards WHERE id = ?';
export const saveSetting = `INSERT INTO settings (key,value,version,updated_at) VALUES (?,?,1,?)
ON CONFLICT(key) DO UPDATE SET value=excluded.value,version=settings.version+1,updated_at=excluded.updated_at`;
export const saveRecord = `INSERT INTO records (id,kind,title,slug,status,data,version,updated_at) VALUES (?,?,?,?,?,?,1,?)
ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,title=excluded.title,slug=excluded.slug,status=excluded.status,data=excluded.data,version=records.version+1,updated_at=excluded.updated_at`;
export const auditWrite = 'INSERT INTO audit_events (id,actor,action,target,created_at) VALUES (?,?,?,?,?)';
