import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc';
import { prisma } from '../prisma';
import { editUserBranchSchema } from '../../utils/auth';

import { z } from 'zod';

export const userRouter = createTRPCRouter({
  //Listar a los usuarios con su sucursal adjunta
  findManyUserBranch: protectedProcedure.query(async ({ctx}) => {
    const users = await ctx.prisma.user.findMany({
      select:{
        id:true,
        name:true,
        lastName:true,
        image:true,
        email:true,
        role:true,
        branchId:true,
        Branch:true
      },
      orderBy:{
        createdAt:'asc'
      }
    });
    return users;
  }),
// Verificar asociaciones del usuario
checkAssociations: protectedProcedure
.input(z.object({ id: z.string() })) // Validar la entrada
.query(async ({ input, ctx }) => {
  const userAssociations = await ctx.prisma.jobApplication.count({
    where: {
      postulantId: input.id, // Asegúrate de que el campo de referencia sea correcto
    },
  });

  return {
    hasAssociations: userAssociations > 0,
  };
}),
  findOne: publicProcedure.input(z.string()).query(async ({ input }) => {
    const user = await prisma.user.findUnique({ where: { id: input } });
    return user;
  }),
  findCurrentOne: protectedProcedure.query(async ({ ctx }) => {
    //console.log('Session in findCurrentOne:', ctx.session);
    if (!ctx.session?.user?.id) {
      throw new Error('Not authenticated');
    }
    const user = await ctx.prisma.user.findUnique({ where: { id: ctx.session.user.id } });
    //console.log('User in findCurrentOne:', user);
    return user;
  }),
  updateUser: protectedProcedure
    .input(editUserBranchSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.user.update({
          where: { id: input.id },
          data: {
            name: input.name,
            lastName: input.lastName,
            role:input.role!,
            branchId:input.branchId      
          },
        });
      } catch (error) {
        console.log(error);
      }
    }),
  deleteOne:  protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    try {
      await ctx.prisma.user.delete({
        where: { id: input.id },
      });
      
    } catch (error) {
      console.log(error);
    }
  }),
});