import Shell from './components/Shell/Shell.tsx'
import Chat from './components/Chat/Chat.tsx'
import Focus from './components/Focus/Focus.tsx'
import Timer from './components/Timer/Timer.tsx'
import Notes from './components/Notes/Notes.tsx'

export default function App() {
  return (
    <Shell
      chat={<Chat />}
      focus={<Focus />}
      timer={<Timer />}
      notes={<Notes />}
    />
  )
}
