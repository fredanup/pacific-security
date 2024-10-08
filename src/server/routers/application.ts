import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { createApplicationSchema, editJobApplicationSchema } from "../../utils/auth";
import { z } from "zod";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { PDFDocument } from 'pdf-lib';
import { prisma } from '../prisma';

export const applicationRouter = createTRPCRouter({
  // Listar a los usuarios con su sucursal adjunta
  findCallApplications: protectedProcedure.input(
    z.object({
      callingId: z.string(),
    })
  ).query(async ({ ctx, input }) => {
    const { callingId } = input;
    try {
      const callingApplications = await ctx.prisma.jobApplication.findMany({
        where: {
          callingId: callingId,
        },
      });
      return callingApplications;
    } catch (error) {
      console.error("Error fetching calling applications:", error);
      throw new Error("Error fetching calling applications");
    }
  }),
  countApplicantsOfMyCallings: protectedProcedure.query(async ({ctx})=>{
    if (!ctx.session?.user?.id) {
      throw new Error('Not authenticated');
    }
  
    const applicantCounts = await ctx.prisma.jobApplication.groupBy({
      by: ['callingId'], // Agrupa por el campo que referencia la convocatoria
      _count: {
        _all: true, // Cuenta todas las filas (postulaciones)
      }
    });    
    
    return applicantCounts;
  }),
  findMyApplications: protectedProcedure
  .query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new Error('Not authenticated');
    }
    try {
      const myApplications = await ctx.prisma.jobApplication.findMany({
        select:{
          id:true,
          postulantId: true,
          callingId: true,
        },
        where: {
          postulantId:ctx.session?.user?.id
        },
      });
      return myApplications;
    } catch (error) {
      console.error("Error fetching my applications:", error);
      throw new Error("Error fetching my applications");
    }
  }),
  getApplicationResults:protectedProcedure.query(async ({ctx})=>{
    if (!ctx.session?.user?.id) {
      throw new Error('Not authenticated');
    }
    try {
      const appResults=await ctx.prisma.jobApplication.findMany({
        select:{
           Calling:{
            select:{
              requirement:true,              
              User:{
                select:{
                  name:true,
                  lastName:true,
                  email:true
                }
              },                            
            }
           },
           interviewAt:true,
           interviewLink:true,
           resumeKey:true,
           status:true,
           review:true,
           finalScore:true
        },
        where:{
          status:{
            in: ["approved","rejected"]
          },
          postulantId:ctx.session.user.id
        }
      })
      return appResults;
    } catch (error) {
      console.log(error);
    }
  })
  ,
  getApplicantsByCalling: publicProcedure.input(z.object({callingId:z.string()})).query(async ({input})=>{
    const {callingId}=input;
    try{
      const applicants=await prisma.jobApplication.findMany({
        select:{
          id:true,
          Postulant:{
            select:{
              name:true,
              lastName:true,
              image:true,
              email:true
            }
          },
          resumeKey:true,
          interviewAt:true,
          interviewLink:true,
          status:true
        },   
        where:{
          callingId:callingId,
          status:{
            in: ["pending","approved"]
          }
        }
      })
      return applicants;
    }
    catch (error) {
      console.log(error);
    }
  }),
  
  acceptApplication:protectedProcedure.input(editJobApplicationSchema).mutation(async ({ctx,input})=>{
    
    try{
      await ctx.prisma.jobApplication.update({
        data: {
          status:"approved",
          interviewAt:input.interviewAt,
          interviewLink:input.interviewLink,
          review:"Usted cumple con todos los requisitos para pasar a la siguiente fase"
        },
        where: {
          id:input.id,
         
        }
      })
    }
    catch{
      throw new Error("There was an error trying to update the record");
    }  
    return { success: true };
  }),
  finalTestApplicant: protectedProcedure
  .input(
    z.object({
      id: z.string(),
      quest1: z.number(),
      quest2: z.number(),
      quest3: z.number(),
      quest4: z.number(),
      quest5: z.number(),
      quest6: z.number(),
      quest7: z.number(),
      quest8: z.number(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    try {
      // Crear un array para almacenar los detalles de las preguntas
      const questionDetails: string[] = [];

      // Agregar el detalle correspondiente a cada pregunta con su puntuación
      questionDetails.push(`Experiencia laboral: ${input.quest1}`);
      questionDetails.push(`Alerta durante el turno: ${input.quest2}`);
      questionDetails.push(`Atención a personas en peligro: ${input.quest3}`);
      questionDetails.push(`Trabajo en equipo: ${input.quest4}`);
      questionDetails.push(`Reacción en caso de robo o vandalismo: ${input.quest5}`);
      questionDetails.push(`Expectativas salariales: ${input.quest6}`);
      questionDetails.push(`Capacitación en TI: ${input.quest7}`);
      questionDetails.push(`Reacción frente a una emergencia: ${input.quest8}`);

      // Calcular el puntaje final
      const result =
        input.quest6 *
        (input.quest1 +
          input.quest2 +
          input.quest3 +
          input.quest4 +
          input.quest5 +
          input.quest7 +
          input.quest8);

      // Generar el mensaje basado en los detalles de las preguntas
      const message = `Reporte detallado de la evaluación del postulante:\n\n${questionDetails.join(
        "\n"
      )}\n\nPuntaje total calculado: ${result}.`;

      // Actualizar el registro en la base de datos con el mensaje descriptivo y el puntaje final
      await ctx.prisma.jobApplication.update({
        data: {
          review2: message,          
          finalScore: result,
        },
        where: {
          id: input.id,
        },
      });

      return { success: true };
    } catch {
      throw new Error("There was an error trying to update the record");
    }
  }),

  rejectApplication:protectedProcedure.input(
    z.object({
    id: z.string(),
    laboralExp: z.number(),
    certEstudio: z.number(),
    sucamec: z.number(),
    licArmas: z.number(),
    dni: z.number(),
    cul: z.number(),
    certFisPsi: z.number()
  })).mutation(async ({ctx,input})=>{
    
    try{
      // Crear un array para almacenar los nombres de los documentos no válidos
      const invalidDocuments: string[] = [];
    
      // Verificar cada campo y agregar el nombre del documento si su valor es 0
      if (input.laboralExp === 0) invalidDocuments.push("Experiencia laboral");
      if (input.certEstudio === 0) invalidDocuments.push("Certificado de estudios");
      if (input.sucamec === 0) invalidDocuments.push("SUCAMEC");
      if (input.licArmas === 0) invalidDocuments.push("Licencia de armas");
      if (input.dni === 0) invalidDocuments.push("DNI");
      if (input.cul === 0) invalidDocuments.push("Certificado único laboral");
      if (input.certFisPsi === 0) invalidDocuments.push("Certificado físico-psicológico");
    
      // Generar el mensaje basado en la validación
      const message = `Usted no cumple con todos los requisitos para pasar a la siguiente fase. Documentos no válidos: ${invalidDocuments.join(", ")}`;
      await ctx.prisma.jobApplication.update({
        data: {
          review: message,
          status:"rejected",
          finalScore:0
        },
        where: {
          id:input.id
        }
      })
    }
    catch{
      throw new Error("There was an error trying to update the record");
    }  
    return { success: true };
  }),
  createApplication: protectedProcedure.input(
    createApplicationSchema
  ).mutation(async ({ ctx, input }) => {
    const { postulantId, callingId } = input;
    try {
      const jobApplication = await ctx.prisma.jobApplication.create({
        data: {
          postulantId: postulantId,
          callingId: callingId,
        },
      });
       // Obtener los documentos del postulante desde S3
       const listObjectsOutput = await ctx.s3.listObjectsV2({
        Bucket: 'pacificsecurity',
        Prefix: `documents/${postulantId}`,
      });

        // Verificar que la respuesta contenga documentos
        if (!listObjectsOutput.Contents) {
        throw new Error("No documents found for the user");
      }
      
      // Descargar los documentos
      const pdfDocs = await Promise.all(
        listObjectsOutput.Contents.map(async (obj) => {
          const getObjectCommand = new GetObjectCommand({
            Bucket: 'pacificsecurity',
            Key: obj.Key,
          });
          const response = await ctx.s3.send(getObjectCommand);
          if (!response.Body) {
            throw new Error(`Failed to get object body for key: ${obj.Key}`);
          }
          const chunks: Uint8Array[] = [];
          for await (const chunk of response.Body as any) {
            chunks.push(chunk);
          }
          const pdfBytes = Buffer.concat(chunks);
          return PDFDocument.load(pdfBytes);
        })
      );

      // Fusionar los documentos en un solo PDF
      const mergedPdf = await PDFDocument.create();
      for (const pdfDoc of pdfDocs) {
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      const mergedPdfBytes = await mergedPdf.save();

      // Subir el PDF fusionado a S3
      const mergedPdfKey = `proceedings/${callingId}/${postulantId}/${jobApplication.id}.pdf`;
      const putObjectCommand = new PutObjectCommand({
        Bucket: 'pacificsecurity',
        Key: mergedPdfKey,
        Body: mergedPdfBytes,
        ContentType: 'application/pdf',
      });
      await ctx.s3.send(putObjectCommand);

      // Actualizar la solicitud de empleo con la clave del PDF fusionado
      await ctx.prisma.jobApplication.update({
        where: { id: jobApplication.id },
        data: { resumeKey: mergedPdfKey },
      });

      return { success: true };
    } catch (error) {
      console.error("Error creating application:", error);
      throw new Error("Error creating application");
    }
  }),
});
