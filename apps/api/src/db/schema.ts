import type { DecisionOptionData, SelectionResultData } from '@piko/domain';
import { relations } from 'drizzle-orm';
import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const userKind = pgEnum('user_kind', ['guest', 'registered']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  kind: userKind('kind').notNull().default('guest'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);

export const decisions = pgTable(
  'decisions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    category: text('category'),
    options: jsonb('options').$type<DecisionOptionData[]>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('decisions_user_id_updated_at_idx').on(table.userId, table.updatedAt)],
);

export const decisionSessionSource = pgEnum('decision_session_source', [
  'decision',
  'preset',
  'draft',
]);

export const decisionSessions = pgTable(
  'decision_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    source: decisionSessionSource('source').notNull(),
    decisionId: uuid('decision_id').references(() => decisions.id, { onDelete: 'set null' }),
    presetSlug: text('preset_slug'),
    title: text('title').notNull(),
    options: jsonb('options').$type<DecisionOptionData[]>().notNull(),
    result: jsonb('result').$type<SelectionResultData>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('decision_sessions_user_id_created_at_idx').on(table.userId, table.createdAt),
    index('decision_sessions_decision_id_idx').on(table.decisionId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  decisions: many(decisions),
  decisionSessions: many(decisionSessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const decisionsRelations = relations(decisions, ({ one, many }) => ({
  user: one(users, {
    fields: [decisions.userId],
    references: [users.id],
  }),
  decisionSessions: many(decisionSessions),
}));

export const decisionSessionsRelations = relations(decisionSessions, ({ one }) => ({
  user: one(users, {
    fields: [decisionSessions.userId],
    references: [users.id],
  }),
  decision: one(decisions, {
    fields: [decisionSessions.decisionId],
    references: [decisions.id],
  }),
}));

export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type DecisionRow = typeof decisions.$inferSelect;
export type DecisionSessionRow = typeof decisionSessions.$inferSelect;
