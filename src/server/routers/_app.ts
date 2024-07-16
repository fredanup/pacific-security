/**
 * This file contains the root router of your tRPC-backend
 */
import { publicProcedure, createTRPCRouter } from '../trpc';
import { postRouter } from './post';
import { observable } from '@trpc/server/observable';
import { clearInterval } from 'timers';
import { userRouter } from './user';
import { branchRouter } from './branch';
import { documentRouter } from './document';
import { callingRouter } from './calling';

export const appRouter = createTRPCRouter({
  healthcheck: publicProcedure.query(() => 'yay!'),

  user: userRouter,
  branch: branchRouter,
  document: documentRouter,
  calling:callingRouter,
  post: postRouter,

  randomNumber: publicProcedure.subscription(() => {
    return observable<number>((emit) => {
      const int = setInterval(() => {
        emit.next(Math.random());
      }, 500);
      return () => {
        clearInterval(int);
      };
    });
  }),
});

export type AppRouter = typeof appRouter;
