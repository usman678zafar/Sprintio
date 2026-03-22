import mongoose, { Document, Schema } from "mongoose";

export interface IWikiPage extends Document {
  projectId: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId | null;
  title: string;
  slug: string;
  content: string;
  order: number;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WikiPageSchema = new Schema<IWikiPage>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: "WikiPage", default: null, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, trim: true, maxlength: 160 },
    content: { type: String, default: "" },
    order: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

WikiPageSchema.index({ projectId: 1, parentId: 1, order: 1 });
WikiPageSchema.index({ projectId: 1, slug: 1 });

export default mongoose.models.WikiPage ||
  mongoose.model<IWikiPage>("WikiPage", WikiPageSchema);
