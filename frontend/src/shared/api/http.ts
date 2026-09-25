// Cliente HTTP base (axios) para las llamadas a la API.
// Un solo lugar para la baseURL y (a futuro) el envío del JWT.
import axios from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 8_000,
});
