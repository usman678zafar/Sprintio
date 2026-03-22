import mongoose, { Schema, Document } from "mongoose";

export type TaskStatus = "Pending" | "In Progress" | "Done";
export type TaskType = "Task" | "Bug" | "Feature" | "Improvement" | "Chore";

export interface ITask extends Document {
  projectId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  assignedTo?: mongoose.Types.ObjectId;
  startDate?: Date;
  deadline?: Date;
  status: TaskStatus;
  type: TaskType;
  parentTaskId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const TaskSchema = new Schema<ITask>({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  title: { type: String, required: true },
  description: { type: String },
  assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
  startDate: { type: Date },
  deadline: { type: Date },
  status: { type: String, enum: ["Pending", "In Progress", "Done"], default: "Pending" },
  type: { type: String, enum: ["Task", "Bug", "Feature", "Improvement", "Chore"], default: "Task" },
  parentTaskId: { type: Schema.Types.ObjectId, ref: "Task" },
  createdAt: { type: Date, default: Date.now },
});

// Indices for faster project-based and user-assigned task lookups
TaskSchema.index({ projectId: 1 });
TaskSchema.index({ assignedTo: 1 });

export default mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
