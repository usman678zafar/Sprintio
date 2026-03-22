import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  name: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  description?: string;
  cardColor?: string;
  languages?: string[];
  documentUrl?: string;
  documentName?: string;
}

const ProjectSchema = new Schema<IProject>({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  description: { type: String, default: "", trim: true, maxlength: 1000 },
  cardColor: { type: String, default: "#D97757" },
  languages: { type: [String], default: [] },
  documentUrl: { type: String, default: "" },
  documentName: { type: String, default: "" },
});

export default mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);
