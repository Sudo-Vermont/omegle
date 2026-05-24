export type Mode = "text" | "video";

export interface Message {
  id: string;
  sender: "you" | "stranger" | "system";
  text: string;
  timestamp: Date;
}

export interface Stats {
  count: number;
}

export type ConnectionState = "idle" | "searching" | "connected" | "error";

export interface WebSocketMessage {
  type: "welcome" | "searching" | "paired" | "disconnected" | "message" | "typing" | "stats" | "idle" | "offer" | "answer" | "ice-candidate";
  id?: string;
  count?: number;
  peerId?: string;
  initiator?: boolean;
  interests?: string[];
  mode?: Mode;
  text?: string;
  isTyping?: boolean;
  sdp?: any;
  candidate?: any;
  reason?: string;
}
