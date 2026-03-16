import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  name: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  description?: string;
  documentUrl?: string;
  documentName?: string;
}

const ProjectSchema = new Schema<IProject>({
  name: { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  description: { type: String, default: "" },
  documentUrl: { type: String, default: "" },
  documentName: { type: String, default: "" },
});

export default mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);
