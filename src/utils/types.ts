// Message types for extension communication
export interface Message {
  type: string;
  payload?: any;
}

export interface ActionMessage extends Message {
  type: 'EXECUTE_ACTION';
  payload: {
    action: 'click' | 'type' | 'navigate';
    selector?: string;
    text?: string;
    url?: string;
  };
}

// Response types
export interface ActionResponse {
  success: boolean;
  error?: string;
} 