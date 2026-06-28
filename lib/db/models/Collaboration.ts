import mongoose, { Document, Schema, Model } from "mongoose";
import type { UserRole } from "@/types";

export interface ICollaboration extends Document {
  _id: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: UserRole;
  invitedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CollaborationSchema = new Schema<ICollaboration>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["owner", "editor", "viewer"],
      required: true,
      default: "viewer",
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId)?.toString();
        ret.documentId = (ret.documentId as mongoose.Types.ObjectId)?.toString();
        ret.userId = (ret.userId as mongoose.Types.ObjectId)?.toString();
        ret.invitedBy = (ret.invitedBy as mongoose.Types.ObjectId)?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

CollaborationSchema.index({ documentId: 1, userId: 1 }, { unique: true });

const Collaboration: Model<ICollaboration> =
  mongoose.models.Collaboration ??
  mongoose.model<ICollaboration>("Collaboration", CollaborationSchema);

export default Collaboration;
