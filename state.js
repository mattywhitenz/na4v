import { makeAutoObservable } from 'mobx';

class AppState {
  conversationState = 'idle';
  userName = '';
  isAudioPlaying = false;
  isRecording = false;

  constructor() {
    makeAutoObservable(this);
  }

  setConversationState(state) {
    this.conversationState = state;
  }

  setUserName(name) {
    this.userName = name;
  }

  setIsAudioPlaying(isPlaying) {
    this.isAudioPlaying = isPlaying;
  }

  setIsRecording(isRecording) {
    this.isRecording = isRecording;
  }

  reset() {
    this.conversationState = 'idle';
    this.userName = '';
    this.isAudioPlaying = false;
    this.isRecording = false;
  }
}

export const appState = new AppState();