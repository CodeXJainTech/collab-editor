export type Language = "javascript" | "python" | "go";

export interface User {
  id: string;
  username: string;
  color: string; // hex color for cursor rendering
}

export interface Room {
  id: string;
  language: Language;
  createdAt: number;
}

export interface CursorPosition {
  lineNumber: number;
  column: number;
}