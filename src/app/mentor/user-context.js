'use client'

import { createContext, useContext } from 'react'

export const MentorUserContext = createContext(null)

export function useMentorUser() {
  return useContext(MentorUserContext)
}
