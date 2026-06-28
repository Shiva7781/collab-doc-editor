import mongoose, { Document, Schema, Model } from "mongoose";

export interface IDocument extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  ownerId: mongoose.Types.ObjectId;
  yjsState: Buffer | null;
  yjsStateVector: Buffer | null;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: 1,
      maxlength: 500,
      default: "Untitled Document",
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    yjsState: { type: Buffer, default: null },
    yjsStateVector: { type: Buffer, default: null },
    wordCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId)?.toString();
        ret.ownerId = (ret.ownerId as mongoose.Types.ObjectId)?.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.yjsState;
        delete ret.yjsStateVector;
        return ret;
      },
    },
  }
);

DocumentSchema.index({ ownerId: 1, createdAt: -1 });
DocumentSchema.index({ updatedAt: -1 });

const DocModel: Model<IDocument> =
  mongoose.models.Document ?? mongoose.model<IDocument>("Document", DocumentSchema);

export default DocModel;
