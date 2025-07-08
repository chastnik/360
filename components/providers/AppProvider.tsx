'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName?: string | null
  department?: string | null
  position?: string | null
  isAdmin: boolean
  isActive: boolean
}

interface AppContextType {
  currentUser: User | null
  isLoading: boolean
  setCurrentUser: (user: User | null) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const useApp = () => {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

interface AppProviderProps {
  children: React.ReactNode
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Здесь будет логика загрузки текущего пользователя
    // Пока что просто убираем загрузку
    setIsLoading(false)
  }, [])

  const value = {
    currentUser,
    isLoading,
    setCurrentUser,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
} 