import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import IdeasPage from './pages/IdeasPage'

function App() {
  const [token, setToken] = useState(localStorage.getItem('access_token'))

  const handleLogin = (accessToken) => {
    localStorage.setItem('access_token', accessToken)
    setToken(accessToken)
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    setToken(null)
  }

  return token ? <IdeasPage onLogout={handleLogout}/> : <LoginPage onLogin={handleLogin} />
}

export default App
