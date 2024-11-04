import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { documentSchema } from '../../utils/auth';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const documentRouter = createTRPCRouter({
  //Creación de url firmada para el documento registrado con clave Key en S3
  createS3UserDocument: protectedProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { s3 } = ctx;
      if (!ctx.session?.user?.id) {
        throw new Error('Not authenticated');
      }
      const userId = ctx.session.user.id;
      const { key } = input;
      const putObjectCommand = new PutObjectCommand({
        Bucket: 'pacificsecurity',
        Key: `documents/${userId}/${key}`
      });
      return await getSignedUrl(s3, putObjectCommand);
    }),
    createOrUpdateDbUserDocument: protectedProcedure
    .input(documentSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session?.user?.id) {
          throw new Error('Not authenticated');
        }
        const userId = ctx.session.user.id;
        
        // Check if the document already exists
        const existingDocument = await ctx.prisma.document.findUnique({
          where: {
            userId_key: {
              userId: userId,
              key: input.key,
            },
          },
        });

        if (existingDocument) {
          // Update the existing document
          await ctx.prisma.document.update({
            where: {
              userId_key: {
                userId: userId,
                key: input.key,
              },
            },
            data: {
              document: input.document,
            },
          });
        } else {
          // Create a new document
          await ctx.prisma.document.create({
            data: {
              document: input.document,
              key: input.key,
              userId: userId,
            },
          });
        }

        // Count the user's documents
        const documentosCount = await ctx.prisma.document.count({
          where: {
            userId: userId,
          },
        });

        // Update the user's 'elegible' field
        await ctx.prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            elegible: documentosCount === 7,
          },
        });

      } catch (error) {
        console.log(error);
      }
    }),
  //Creación de documento en Prisma
  createDbUserDocument: protectedProcedure
    .input(documentSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.session?.user?.id) {
          throw new Error('Not authenticated');
        }
        await ctx.prisma.document.create({
          data: {
            document: input.document,
            key: input.key,
            userId: ctx.session.user.id,
          },
        });
         // Contar los documentos del usuario
      const documentosCount = await ctx.prisma.document.count({
        where: {
          userId:ctx.session.user.id,
        },
      });
       // Actualizar el campo 'apto' del usuario
      await ctx.prisma.user.update({
        where: {
          id: ctx.session.user.id,
        },
        data: {
          elegible: documentosCount === 7,
        },
      });

      } catch (error) {
        console.log(error);
      }
    }),

  getUserDocuments: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      console.log('Fetching documents for userId:', input.userId);
      try {
        const documentMetaData = await ctx.prisma.document.findMany({
          select: {
            document: true,
            key: true,
          },
          where: {
            userId: input.userId,
          },
        });
        
        if (!documentMetaData || documentMetaData.length === 0) {
          console.error('No document metadata found for userId:', input.userId);
          return []; // Maneja el caso donde no hay documentos
        }
        const { s3 } = ctx;
        const listObjectsOutput = await s3.listObjectsV2({
          Bucket: 'pacificsecurity',
          Prefix: `documents/${input.userId}`, //Prefix: es la ruta de donde se listarán los objetos
        });
        
        
        const combinedList = documentMetaData.map((document) => {
          let s3Object;
          if (listObjectsOutput.Contents) {
            s3Object = listObjectsOutput.Contents.find(
              (obj) => obj.Key === document.key,
            );
          }
       
          return {
            ...document,
            s3Object,
          };
        });
        
        return combinedList;
      } catch (error) {
        console.error('Error fetching documents:', error);
        throw error; // O manejar el error según tu lógica
      }
    }),

});