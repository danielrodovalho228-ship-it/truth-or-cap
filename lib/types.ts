// Truth or Cap — Core Type Definitions
// These types should match the Supabase schema in /supabase/migrations/0001_initial_schema.sql

// ============================================================================
// Core enums
// ============================================================================

export type Vote = 'truth' | 'cap';

export type InviteContext =
  | 'curiosity'
  | 'streak'
  | 'challenge'
  | 'group'
  | 'leaderboard'
  | 'manual';

export type InviteChannel =
  | 'whatsapp'
  | 'sms'
  | 'copy'
  | 'qr'
  | 'native_share';

export type FriendshipSource = 'contact' | 'invite' | 'username_search' | 'qr';

// ============================================================================
// Profile
// ============================================================================

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  phone_hash: string | null;
  voice_baseline_features: VoiceBaseline | null;
  voice_baseline_at: string | null;
  current_streak: number;
  streak_protected_until: string | null;
  total_invites_sent: number;
  total_invites_redeemed: number;
  created_at: string;
  updated_at: string;
}

export interface VoiceBaseline {
  pitch_mean: number;
  pitch_std: number;
  speech_rate: number;
  energy_mean: number;
  pause_rate: number;
  emotion_baseline: Record<string, number>;
}

// ============================================================================
// Game
// ============================================================================

export interface Game {
  id: string;
  player_id: string;
  player_username: string;
  question: string;
  declared_answer: Vote;
  recording_url: string;
  recording_duration_ms: number;
  created_at: string;
  expires_at: string;
  is_public: boolean;
  view_count: number;
}

// ============================================================================
// Analysis
// ============================================================================

export interface Analysis {
  id: string;
  game_id: string;
  sus_level: number; // 0-100
  voice_stress_score: number;
  facial_score: number;
  linguistic_score: number;
  transcription: string;
  reasons: AnalysisReason[];
  raw_voice_data: HumeVoiceResult | null;
  raw_facial_data: HumeFaceResult | null;
  model_version: string;
  processing_time_ms: number;
  created_at: string;
}

export interface AnalysisReason {
  category: 'voice' | 'face' | 'language' | 'consistency';
  signal: string;
  weight: number; // -1.0 (honest) to 1.0 (sus)
  description: string;
}

export interface HumeVoiceResult {
  prosody: {
    confidence: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    nervousness: number;
    [emotion: string]: number;
  };
  speech_rate: number;
  pitch_variance: number;
  pause_count: number;
}

export interface HumeFaceResult {
  expressions: { [expression: string]: number };
  micro_expressions: Array<{
    timestamp_ms: number;
    type: string;
    intensity: number;
  }>;
}

// ============================================================================
// Vote
// ============================================================================

export interface VoteRecord {
  id: string;
  game_id: string;
  voter_id: string | null;
  voter_ip_hash: string | null;
  vote: Vote;
  created_at: string;
}

// ============================================================================
// Invitation
// ============================================================================

export interface Invitation {
  id: string;
  inviter_id: string;
  invitee_phone_hash: string | null;
  invitee_email: string | null;
  invite_code: string;
  channel: InviteChannel | null;
  context: InviteContext | null;
  source_game_id: string | null;
  redeemed_at: string | null;
  redeemed_by_user_id: string | null;
  created_at: string;
  expires_at: string;
}

// ============================================================================
// Friendship
// ============================================================================

export interface Friendship {
  user_id: string;
  friend_id: string;
  source: FriendshipSource;
  created_at: string;
}

export interface FriendStat {
  user_id: string;
  friend_id: string;
  games_against: number;
  detection_accuracy: number;
  last_played_at: string | null;
}

// ============================================================================
// UI State
// ============================================================================

export interface RecordingState {
  status:
    | 'idle'
    | 'requesting'
    | 'ready'
    | 'recording'
    | 'processing'
    | 'uploading'
    | 'analyzing'
    | 'complete'
    | 'error';
  duration: number;
  error?: string;
}

export type ViewState = 'OWNER' | 'FIRST_VISITOR' | 'RETURNING_VIEWER';
