import mongoose, { Schema, Document } from "mongoose";

export interface IProjectMember extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: "MASTER" | "MEMBER";
}

const ProjectMemberSchema = new Schema<IProjectMember>({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["MASTER", "MEMBER"], default: "MEMBER" },
});

// Ensure a user cannot be added twice to the same project
ProjectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });
ProjectMemberSchema.index({ userId: 1 });

export default mongoose.models.ProjectMember || mongoose.model<IProjectMember>("ProjectMember", ProjectMemberSchema);
