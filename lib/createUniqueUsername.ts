import { supabase } from '@/lib/supabase'
import { generateUsername } from '@/lib/username-generator'

export async function createUniqueUsername() {
  for (let i = 0; i < 10; i++) {
    const candidate = generateUsername()

    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', candidate)
      .maybeSingle()

    if (!data) {
      return candidate
    }
  }

  // fallback (guaranteed unique)
  return `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}