import type { DatabaseConnection } from '../../db/connection.js';

export type LedgerAction = 'FAVORITE' | 'PURCHASE';

export function createRewardsRepository(db: DatabaseConnection) {
  const insertLedger = db.prepare(
    `INSERT INTO points_ledger (user_id, action, reference, points)
     VALUES (:userId, :action, :reference, :points)
     ON CONFLICT (user_id, action, reference) DO NOTHING`,
  );

  const updateBalance = db.prepare(
    'UPDATE users SET points_balance = points_balance + :points WHERE id = :userId',
  );

  const selectBalance = db.prepare(
    'SELECT points_balance AS pointsBalance FROM users WHERE id = ?',
  );

  const sumLedger = db.prepare(
    'SELECT COALESCE(SUM(points), 0) AS totalPoints FROM points_ledger WHERE user_id = ?',
  );

  return {
    awardPoints(
      userId: number,
      action: LedgerAction,
      reference: string,
      points: number,
    ): { pointsAwarded: number; pointsBalance: number } {
      const result = insertLedger.run({
        userId,
        action,
        reference,
        points,
      });

      if (result.changes > 0) {
        updateBalance.run({ userId, points });
      }

      const balanceRow = selectBalance.get(userId) as { pointsBalance: number } | undefined;
      return {
        pointsAwarded: result.changes > 0 ? points : 0,
        pointsBalance: balanceRow?.pointsBalance ?? 0,
      };
    },

    getBalance(userId: number): number {
      const row = selectBalance.get(userId) as { pointsBalance: number } | undefined;
      return row?.pointsBalance ?? 0;
    },

    getSumFromLedger(userId: number): number {
      const row = sumLedger.get(userId) as { totalPoints: number } | undefined;
      return row?.totalPoints ?? 0;
    },
  };
}

export type RewardsRepository = ReturnType<typeof createRewardsRepository>;
