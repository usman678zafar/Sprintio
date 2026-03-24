import mongoose, { Document, Schema } from "mongoose";

interface IWikiPageVersion {
  title: string;
  content: string;
  document?: Record<string, unknown> | null;
  savedAt: Date;
  updatedBy: mongoose.Types.ObjectId;
}

export interface IWikiPage extends Document {
  projectId: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId | null;
  title: string;
  slug: string;
  content: string;
  document?: Record<string, unknown> | null;
  excerpt: string;
  order: number;
  versions: IWikiPageVersion[];
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WikiPageVersionSchema = new Schema<IWikiPageVersion>(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    content: { type: String, default: "" },
    document: { type: Schema.Types.Mixed, default: null },
    savedAt: { type: Date, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false }
);

const WikiPageSchema = new Schema<IWikiPage>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: "WikiPage", default: null, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, trim: true, maxlength: 160 },
    content: { type: String, default: "" },
    document: { type: Schema.Types.Mixed, default: null },
    excerpt: { type: String, default: "", trim: true, maxlength: 280 },
    order: { type: Number, default: 0 },
    versions: { type: [WikiPageVersionSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

WikiPageSchema.index({ projectId: 1, parentId: 1, order: 1 });
WikiPageSchema.index({ projectId: 1, slug: 1 });

export default mongoose.models.WikiPage ||
  mongoose.model<IWikiPage>("WikiPage", WikiPageSchema);
