export type SettingsTabId =
  | 'general'
  | 'appearance'
  | 'suspension'
  | 'cloud'
  | 'backup'
  | 'shortcuts'
  | 'about'
  | 'contact';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTabId;
}

export interface ToastMessage {
  text: string;
  type: 'success' | 'error';
}
