export type Role = "user" | "assistant" | "system";

export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export type Message = {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  createdAt: number;
  updatedAt: number;
  isLoading?: boolean;
};

