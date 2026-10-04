import db from '../../db/database';

export class RewardsRepository {
  getPoints(userId: number): number {
    const row = db
      .prepare('SELECT points FROM users WHERE id = ?')
      .get(userId) as { points: number } | undefined;
    return row?.points ?? 0;
  }

  addPoints(userId: number, delta: number, reason: string, referenceId?: number) {
    db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(delta, userId);
    db.prepare(
      `INSERT INTO points_ledger (user_id, delta, reason, reference_id)
       VALUES (?, ?, ?, ?)`
    ).run(userId, delta, reason, referenceId ?? null);
  }

  getLedger(userId: number) {
    return db
      .prepare(
        `SELECT id, delta, reason, reference_id, created_at
         FROM points_ledger
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 50`
      )
      .all(userId);
  }
}
