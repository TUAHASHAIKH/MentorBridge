'use client'

import { createContext, useContext } from 'react'

export const StudentUserContext = createContext(null)

export function useStudentUser() {
  return useContext(StudentUserContext)
}
