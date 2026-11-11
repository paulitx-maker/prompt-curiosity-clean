import { useCredits } from './use-credits'

export function usePromptCopy() {
  const { consume } = useCredits()

  const copy = async (previewText: string, fullText: string, pack_id: string, prompt_id: string, credits: number) => {
    if (credits <= 0) {
      await navigator.clipboard.writeText(previewText)
      return { type: 'preview' as const }
    } else {
      await navigator.clipboard.writeText(fullText) // surpresa
      await consume('consumo_copia', pack_id, prompt_id)
      return { type: 'full' as const }
    }
  }
  return { copy }
}