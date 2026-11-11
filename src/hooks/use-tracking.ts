import { supabase } from '@/integrations/supabase/client'
import { getDeviceId } from '@/lib/device'

export function useTracking() {
  const track = async (evento: string, data: any = {}) => {
    try {
      const device_id = getDeviceId()
      if(!device_id) return
      await supabase.from('user_events').insert({
        device_id,
        evento,
        pack_id: data.pack_id || null,
        prompt_id: data.prompt_id || null,
        metadata: data.metadata || data
      } as any)
    } catch (e) {
      console.log('track error', e)
    }
  }
  return { track }
}