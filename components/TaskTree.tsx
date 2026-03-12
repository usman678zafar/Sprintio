"use client";

import { useState } from "react";
import TaskItem from "./TaskItem";

interface TaskTreeProps {
  tasks: any[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  onDelete: (taskId: string) => void;
  onAddSubtask: (parentId: string) => void;
  onEdit: (task: any) => void;
  canManageTasks: boolean;
  currentUserId?: string;
}

export default function TaskTree({
  tasks,
  onStatusChange,
  onDelete,
  onAddSubtask,
  onEdit,
  canManageTasks,
  currentUserId,
}: TaskTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleExpand = (taskId: string) => {
    setExpandedNodes(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Build tree structure
  const buildTree = (parentId: string | null = null): any[] => {
    return tasks
      .filter(t => (parentId === null ? !t.parentTaskId : t.parentTaskId === parentId))
      .map(t => ({ ...t, children: buildTree(t._id) }));
  };

  const tree = buildTree(null);

  const renderTree = (nodes: any[], level = 0) => {
    return nodes.map(node => {
      const hasChildren = node.children.length > 0;
      const isExpanded = expandedNodes[node._id] !== false; // Default expanded

      return (
        <div key={node._id}>
          <TaskItem
            task={node}
            level={level}
            hasChildren={hasChildren}
            expanded={isExpanded}
            toggleExpand={() => toggleExpand(node._id)}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            onAddSubtask={onAddSubtask}
            onEdit={onEdit}
            canManageTasks={canManageTasks}
            currentUserId={currentUserId}
          />
          {hasChildren && isExpanded && (
            <div className="task-children">
              {renderTree(node.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 border border-dashed border-gray-200 rounded-lg">
        No tasks found. Click "Add Task" to create one.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {renderTree(tree)}
    </div>
  );
}
