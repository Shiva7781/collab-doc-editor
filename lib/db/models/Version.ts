import mongoose, { Document, Schema, Model } from "mongoose";

export interface IVersion extends Document {
  _id: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  yjsSnapshot: Buffer;
  textContent: string;
  createdBy: mongoose.Types.ObjectId;
  snapshotSize: number;
  createdAt: Date;
}

const VersionSchema = new Schema<IVersion>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200, default: "Snapshot" },
    description: { type: String, trim: true, maxlength: 1000 },
    yjsSnapshot: { type: Buffer, required: true },
    textContent: { type: String, default: "", maxlength: 50000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    snapshotSize: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId)?.toString();
        ret.documentId = (ret.documentId as mongoose.Types.ObjectId)?.toString();
        ret.createdBy = (ret.createdBy as mongoose.Types.ObjectId)?.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.yjsSnapshot;
        return ret;
      },
    },
  }
);

VersionSchema.index({ documentId: 1, createdAt: -1 });

const MAX_VERSIONS_PER_DOC = 50;
VersionSchema.post("save", async function () {
  const count = await (this.constructor as Model<IVersion>).countDocuments({
    documentId: this.documentId,
  });
  if (count > MAX_VERSIONS_PER_DOC) {
    const oldest = await (this.constructor as Model<IVersion>)
      .find({ documentId: this.documentId })
      .sort({ createdAt: 1 })
      .limit(count - MAX_VERSIONS_PER_DOC)
      .select("_id");
    await (this.constructor as Model<IVersion>).deleteMany({
      _id: { $in: oldest.map((v) => v._id) },
    });
  }
});

const Version: Model<IVersion> =
  mongoose.models.Version ?? mongoose.model<IVersion>("Version", VersionSchema);

export default Version;
