import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { knex } from '../database';
import { randomUUID } from 'crypto';
import { checkSessionIdExists } from '../middlewares/check-session-id-exists';

export async function transactionsRoutes(app: FastifyInstance) {
  app.get(
    '/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const { sessionId } = request.cookies;

      const transactions = await knex('transactions')
        .where('session_id', sessionId)
        .select();

      return { transactions };
    },
  );

  app.get(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const getTransactionParamsSchema = z.object({
        id: z.string().uuid(),
      });

      const { sessionId } = request.cookies;
      const { id } = getTransactionParamsSchema.parse(request.params);

      const transaction = await knex('transactions')
        .where({
          session_id: sessionId,
          id,
        })
        .first();

      return { transaction };
    },
  );

  app.get(
    '/sumary',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const { sessionId } = request.cookies;

      const sumary = await knex('transactions')
        .where('session_id', sessionId)
        .sum('amont', { as: 'amount' })
        .first();

      return { sumary };
    },
  );

  app.post('/', async (request, reply) => {
    const createTransactionsSchema = z.object({
      title: z.string(),
      amont: z.number(),
      type: z.enum(['credit', 'debit']),
    });

    const { title, amont, type } = createTransactionsSchema.parse(request.body);

    let sessionId = request.cookies.sessionId;

    if (!sessionId) {
      sessionId = randomUUID();

      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    await knex('transactions').insert({
      id: randomUUID(),
      title,
      amont: type === 'credit' ? amont : amont * -1,
      session_id: sessionId,
    });
    return reply.status(201).send();
  });
}
