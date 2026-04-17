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


export const JUDGE0_LANGUAGE_IDS: Record<Language, number> = {
  javascript: 63,
  python: 71,  
  go: 60,   
};