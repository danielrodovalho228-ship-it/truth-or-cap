import { createClient } from '@/lib/supabase/client';
import { hashPhone } from './contacts';
import type { InviteContext, InviteChannel } from '@/lib/types';

export interface CreateInviteParams {
  context: InviteContext;
  channel: InviteChannel;
  inviteePhone?: string;
  sourceGameId?: string;
}

export interface CreateInviteResult {
  inviteCode: string;
  url: string;
  message: string;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

const MESSAGES: Record<InviteContext, (url: string) => string> = {
  curiosity: (url) => `Curious if you can spot when I'm capping? 🎭 Test it on Truth or Cap: ${url}`,
  streak: (url) => `My streak ends in 6h — keep me alive 🙏 ${url}`,
  challenge: (url) => `Bet you can't beat my SUS score 🚨 ${url}`,
  group: (url) => `Squad detector unlocks when 5 of you join. You're up next 🔓 ${url}`,
  leaderboard: (url) => `My ranking is locked until you join. Save my dignity ${url}`,
  manual: (url) => `Found this game — you'd be good at it. ${url}`,
};

export async function createInvite(params: CreateInviteParams): Promise<CreateInviteResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const phoneHash = params.inviteePhone ? await hashPhone(params.inviteePhone) : null;

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      inviter_id: user.id,
      invitee_phone_hash: phoneHash,
      channel: params.channel,
      context: params.context,
      source_game_id: params.sourceGameId ?? null,
    })
    .select('invite_code')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Could not create invite');

  // Fire-and-forget counter increment (RPC defined in migration 0001).
  void supabase.rpc('increment_invites_sent', { p_user_id: user.id });

  const url = `${SITE_URL}/i/${data.invite_code}`;
  const message = MESSAGES[params.context](url);
  return { inviteCode: data.invite_code, url, message };
}
