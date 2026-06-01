import prisma from "../../lib/prisma";
import { ParsedRepositoryKnowledge } from "../parsers/gitverseConfigParser";

export const repositoryKnowledgeService = {
  async getKnowledge(repositoryId: number) {
    return await prisma.repositoryKnowledge.findUnique({
      where: { repositoryId }
    });
  },

  async upsertKnowledge(repositoryId: number, knowledge: ParsedRepositoryKnowledge) {
    // Determine if we have any actual data to save
    const hasData = 
      !!knowledge.projectDescription || 
      (knowledge.glossary && Object.keys(knowledge.glossary).length > 0) || 
      (knowledge.onboardingNotes && knowledge.onboardingNotes.length > 0) ||
      (knowledge.architecturePrinciples && knowledge.architecturePrinciples.length > 0);

    if (!hasData) {
      // If no data, delete existing knowledge if any
      await prisma.repositoryKnowledge.deleteMany({
        where: { repositoryId }
      });
      return null;
    }

    return await prisma.repositoryKnowledge.upsert({
      where: { repositoryId },
      update: {
        projectDescription: knowledge.projectDescription || null,
        glossary: knowledge.glossary || null,
        onboardingNotes: knowledge.onboardingNotes ? JSON.stringify(knowledge.onboardingNotes) : null,
        architecturePrinciples: knowledge.architecturePrinciples ? JSON.stringify(knowledge.architecturePrinciples) : null,
      },
      create: {
        repositoryId,
        projectDescription: knowledge.projectDescription || null,
        glossary: knowledge.glossary || null,
        onboardingNotes: knowledge.onboardingNotes ? JSON.stringify(knowledge.onboardingNotes) : null,
        architecturePrinciples: knowledge.architecturePrinciples ? JSON.stringify(knowledge.architecturePrinciples) : null,
      }
    });
  }
};
