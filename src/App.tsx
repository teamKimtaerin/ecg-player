import './App.css'
import CaptionWithIntention from './components/CaptionWithIntention'

function App() {
  return (
    <div className="app">
      <header>
        <h1>Caption With Intention System</h1>
        <p>Advanced captioning system with speaker identity, voice characteristics, and speech dynamics visualization</p>
      </header>
      
      <main>
        <CaptionWithIntention />
      </main>
      
      <footer style={{ marginTop: '40px', textAlign: 'center', opacity: 0.6 }}>
        <p>Upload a video and timing sync JSON file to test Caption With Intention system</p>
        <p>Try the test file: <code>generated_timing_sync.json</code></p>
        <p><em>🎯 Caption With Intention: JSON-based perfect design system with GSAP animations</em></p>
      </footer>
    </div>
  )
}

export default App
