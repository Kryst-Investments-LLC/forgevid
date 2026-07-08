// Types for Real-Time Collaboration
export type RoomId = string;
export type UserId = string;
export type Edit = {
  type: 'insert' | 'delete' | 'update';
  target: string;
  value: any;
};
export type Suggestion = {
  message: string;
  confidence: number;
};
