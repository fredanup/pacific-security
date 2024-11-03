import { createTRPCRouter, publicProcedure } from '../trpc';
import { prisma } from '../prisma';

import { z } from 'zod';
import { IBranch } from 'utils/auth';

export const branchRouter = createTRPCRouter({
  //Listar a los usuarios con su sucursal adjunta
  findMany: publicProcedure.query(async () => {
    const branchs = await prisma.branch.findMany();
    return branchs;
  }),
  createBranch: publicProcedure.input(z.object({
    name: z.string(),
    address: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      const { name, address } = input;
      const newBranch:IBranch=await ctx.prisma.branch.create({          
        data: {                
            name: name,        
            address: address             
        },
      });
      return newBranch
    } catch (error) {
      console.log(error);
    }
  }),
});