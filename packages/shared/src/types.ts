import { z } from "zod";

export const AffinityGroupSchema = z.object({
  group_id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
});

export const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  location: z.string().optional(),
});

export const KnowledgeBaseResourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type AffinityGroup = z.infer<typeof AffinityGroupSchema>;
export type Event = z.infer<typeof EventSchema>;
export type KnowledgeBaseResource = z.infer<typeof KnowledgeBaseResourceSchema>;
