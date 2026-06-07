// server/src/services/logs.service.js
import { supabase } from './supabase.js';

/**
 * Log an action to the audit_logs table.
 */
export async function log({ userId, actionType, entityType = null, entityId = null, payloadBefore = null, payloadAfter = null, ipAddress = null }) {
  // Fetch user name for denormalization if userId is provided
  let userName = null;
  if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();
    userName = profile?.full_name;
  }

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: userId,
      user_name: userName,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      payload_before: payloadBefore,
      payload_after: payloadAfter,
      ip_address: ipAddress,
    });

  if (error) {
    console.error('Audit log failed:', error);
    // We don't throw here to avoid failing the main transaction if logging fails
  }
}
