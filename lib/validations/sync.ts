import { z } from "zod";

const MAX_PAYLOAD_BYTES = parseInt(process.env.MAX_SYNC_PAYLOAD_BYTES ?? "5242880", 10); // 5 MB

// Validate base64-encoded binary data and enforce size limits
const binaryField = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .refine((val) => {
      try {
        const buf = Buffer.from(val, "base64");
        return buf.length <= MAX_PAYLOAD_BYTES;
      } catch {
        return false;
      }
    }, `${label} exceeds maximum allowed size (${MAX_PAYLOAD_BYTES} bytes)`);

export const SyncPayloadSchema = z.object({
  documentId: z.string().min(1).max(100),
  update: binaryField("update"),
  stateVector: z.string().optional(),
  clientId: z.string().min(1).max(100),
});

export const CreateVersionSchema = z.object({
  title: z.string().min(1).max(200).default("Snapshot"),
  description: z.string().max(1000).optional(),
});

export const CreateDocumentSchema = z.object({
  title: z.string().min(1).max(500).default("Untitled Document"),
});

export const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  wordCount: z.number().int().min(0).optional(),
});

export const AddCollaboratorSchema = z.object({
  email: z.string().email(),
  role: z.enum(["editor", "viewer"]),
});

export const UpdateCollaboratorRoleSchema = z.object({
  role: z.enum(["editor", "viewer"]),
});

export type SyncPayload = z.infer<typeof SyncPayloadSchema>;
export type CreateVersion = z.infer<typeof CreateVersionSchema>;
export type CreateDocument = z.infer<typeof CreateDocumentSchema>;
export type UpdateDocument = z.infer<typeof UpdateDocumentSchema>;
export type AddCollaborator = z.infer<typeof AddCollaboratorSchema>;
