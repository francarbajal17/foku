export interface ChatMessage {
  id: string
  fromMe: boolean
  timestamp: number
  contentType: 'text' | 'image' | 'audio' | 'other'
  text?: string
  mediaData?: string
  mediaLabel?: string
  authorName?: string
}
