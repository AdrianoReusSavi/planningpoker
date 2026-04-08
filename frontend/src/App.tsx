import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ConnectionProvider } from './contexts/ConnectionContext'
import { RoomProvider } from './contexts/RoomContext'
import { ToastProvider } from './contexts/ToastContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { I18nProvider } from './contexts/I18nContext'
import Home from './pages/Home'
import MiniView from './pages/MiniView'

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <ThemeProvider>
          <Routes>
            <Route path="/mini" element={<MiniView />} />
            <Route path="/" element={
              <ConnectionProvider>
                <RoomProvider>
                  <ToastProvider>
                    <Home />
                  </ToastProvider>
                </RoomProvider>
              </ConnectionProvider>
            } />
          </Routes>
        </ThemeProvider>
      </I18nProvider>
    </BrowserRouter>
  )
}