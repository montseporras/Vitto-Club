import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DocumentType } from '@/domain/documents'
import type { ApiError } from '@/shared/api/ApiError'
import type {
  Client,
  CreateClientBody,
  UpdateClientBody,
} from '../types/cliente'
import { createClient, findClientByDocument, updateClient } from './caja.api'

export const useCreateClient = () =>
  useMutation<Client, ApiError, CreateClientBody>({
    mutationFn: createClient,
  })

export type DocumentSearch = {
  documentType: DocumentType
  documentNumber: string
}

const clientByDocumentKey = ({ documentType, documentNumber }: DocumentSearch) =>
  ['customers', 'by-document', documentType, documentNumber] as const

/** Busca al cliente por documento. No pide nada hasta que haya una búsqueda. */
export const useClientByDocument = (search: DocumentSearch | null) =>
  useQuery<Client, ApiError>({
    queryKey: search ? clientByDocumentKey(search) : ['customers', 'by-document'],
    queryFn: () =>
      findClientByDocument(search!.documentType, search!.documentNumber),
    enabled: search !== null,
    // Un 404 es una respuesta válida ("no existe"): no tiene sentido reintentar
    retry: (count, error) => error.status === undefined && count < 1,
  })

export const useUpdateClient = () => {
  const queryClient = useQueryClient()
  return useMutation<Client, ApiError, { id: number; body: UpdateClientBody }>({
    mutationFn: ({ id, body }) => updateClient(id, body),
    onSuccess: (client) => {
      // Si cambió el documento, la búsqueda vieja ya no aplica
      queryClient.removeQueries({ queryKey: ['customers', 'by-document'] })
      queryClient.setQueryData(clientByDocumentKey(client), client)
    },
  })
}
