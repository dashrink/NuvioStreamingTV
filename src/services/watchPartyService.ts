import { EventEmitter } from 'eventemitter3';
import { mmkvStorage } from './mmkvStorage';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text?: string;
  gifUrl?: string;
  emoji?: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface WatchPartyState {
  isActive: boolean;
  sessionId: string | null;
  participants: { id: string; name: string }[];
}

class WatchPartyService extends EventEmitter {
  private state: WatchPartyState = {
    isActive: false,
    sessionId: null,
    participants: [],
  };

  private messages: ChatMessage[] = [];
  private currentUserId: string = 'user-' + Math.random().toString(36).substr(2, 9);
  private currentUserName: string = 'You';

  constructor() {
    super();
    this.loadSettings();
  }

  private loadSettings() {
    const savedName = mmkvStorage.getString('watch_party_user_name');
    if (savedName) {
      this.currentUserName = savedName;
    }
  }

  public setUserName(name: string) {
    this.currentUserName = name;
    mmkvStorage.setString('watch_party_user_name', name);
  }

  public startSession() {
    this.state.isActive = true;
    this.state.sessionId = 'session-' + Date.now();
    this.state.participants = [{ id: this.currentUserId, name: this.currentUserName }];
    this.emit('stateChanged', this.state);

    // Simulate other users joining
    setTimeout(() => {
      this.addSystemMessage('Alice joined the watch party');
      this.state.participants.push({ id: 'user-alice', name: 'Alice' });
      this.emit('stateChanged', this.state);
    }, 2000);

    setTimeout(() => {
      this.addSystemMessage('Bob joined the watch party');
      this.state.participants.push({ id: 'user-bob', name: 'Bob' });
      this.emit('stateChanged', this.state);

      // Simulate chat messages
      setTimeout(() => {
        this.receiveMessage({
          id: Date.now().toString(),
          senderId: 'user-alice',
          senderName: 'Alice',
          text: 'Hey everyone! Excited to watch this.',
          timestamp: Date.now(),
        });
      }, 1000);
    }, 5000);
  }

  public stopSession() {
    this.state.isActive = false;
    this.state.sessionId = null;
    this.state.participants = [];
    this.messages = [];
    this.emit('stateChanged', this.state);
    this.emit('messagesChanged', this.messages);
  }

  public sendMessage(text?: string, gifUrl?: string, emoji?: string) {
    if (!this.state.isActive) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      senderId: this.currentUserId,
      senderName: this.currentUserName,
      text,
      gifUrl,
      emoji,
      timestamp: Date.now(),
    };

    this.messages = [...this.messages, message];
    this.emit('messagesChanged', this.messages);

    // Simulate response
    if (text) {
      this.simulateResponse(text);
    }
  }

  private simulateResponse(text: string) {
    if (Math.random() > 0.7) {
      setTimeout(
        () => {
          const responses = [
            'Totally agree!',
            'Wait, what happened?',
            'This scene is amazing!',
            'lol',
            'I love this character.',
          ];
          const randomResponse = responses[Math.floor(Math.random() * responses.length)];
          this.receiveMessage({
            id: Date.now().toString(),
            senderId: Math.random() > 0.5 ? 'user-alice' : 'user-bob',
            senderName: Math.random() > 0.5 ? 'Alice' : 'Bob',
            text: randomResponse,
            timestamp: Date.now(),
          });
        },
        2000 + Math.random() * 3000
      );
    }
  }

  private receiveMessage(message: ChatMessage) {
    this.messages = [...this.messages, message];
    this.emit('messagesChanged', this.messages);
  }

  private addSystemMessage(text: string) {
    const message: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'system',
      senderName: 'System',
      text,
      timestamp: Date.now(),
      isSystem: true,
    };
    this.messages = [...this.messages, message];
    this.emit('messagesChanged', this.messages);
  }

  public getMessages() {
    return this.messages;
  }

  public getState() {
    return this.state;
  }

  public getCurrentUserId() {
    return this.currentUserId;
  }
}

export const watchPartyService = new WatchPartyService();
