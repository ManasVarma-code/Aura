
export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other',
  PREFER_NOT_TO_SAY = 'Prefer not to say'
}

export enum CyclePhase {
  MENSTRUAL = 'Menstrual',
  FOLLICULAR = 'Follicular',
  OVULATION = 'Ovulation',
  LUTEAL = 'Luteal',
  PMS = 'PMS'
}

export interface User {
  id: string;
  email: string;
  name: string;
  partnerNickname: string;
  gender: Gender | null;
  linked: boolean;
  coupleCode: string;
  partnerCode?: string;
}

export interface Memory {
  id: string;
  type: 'photo' | 'note';
  title: string;
  content: string;
  date: string;
  imageUrl?: string;
  location?: string;
}

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'cycle' | 'anniversary' | 'date' | 'challenge' | 'reminder' | 'mood' | 'milestone' | 'festival';
  description: string;
  emotion?: string;
  coupleSuggestion?: string;
}

export interface FestivalData {
  date: string;
  title: string;
  type: 'festival' | 'observance' | 'wellness' | 'relationship';
  emotion: string;
  short_description: string;
  couple_suggestion: string;
  visual_tone: 'warm' | 'pastel' | 'festive' | 'calm';
  notification_style: 'soft' | 'celebratory' | 'reflective';
}
