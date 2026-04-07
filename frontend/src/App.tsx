import { ConnectionProvider } from './contexts/ConnectionContext'

function App() {
  return (
    <ConnectionProvider>
      <div className="app">
        <h1>Planning Poker</h1>
      </div>
    </ConnectionProvider>
  )
}

export default App