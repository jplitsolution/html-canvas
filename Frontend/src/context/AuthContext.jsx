import { createContext, useContext, useState, useEffect, memo } from 'react'
import { getCurrentUser } from '../services/api/auth'

const AuthContext = createContext({
  user: null,
  loading: true,
  isAuthenticated: false,
})

export function useAuth() {
  return useContext(AuthContext)
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export default memo(AuthProvider)
