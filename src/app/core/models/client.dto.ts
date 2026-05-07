export interface ClientDTO {
  idCliente: number;
  nombre: string;
  direccion: string;
  telefonos: string[];
  correo?: string;
  // Backwards compatibility for UI mocks
  id: string;
  name: string;
  phones: string[];
  address: string | null;
  isActive: boolean;
  email?: string;
  createdAt?: string;
}

export interface ClientRequestDTO {
  nombre: string;
  telefonos: string[];
  direccion: string;
  correo?: string;
}

export interface ClientResponseDTO {
  message: string;
  code: number;
  data: ClientDTO;
}

export interface OrderClientDTO {
  idCliente: number;
  nombreCompleto: string;
  telefono: string;
  direccion?: string;
}
