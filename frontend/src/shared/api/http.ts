import axios from 'axios'

export const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

export const http = axios.create({
  baseURL: API_URL,
  timeout: 8_000,
  withCredentials: true, // refresh token en cookie httpOnly (cuando exista auth)
})
