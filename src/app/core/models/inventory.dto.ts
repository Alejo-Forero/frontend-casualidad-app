export interface UnitDTO {
  id: string;
  name: string;
}

export type ProductType = 'INSUMO' | 'ELABORADO' | 'TRANSFORMADO' | 'REVENTA';

export interface CompositionItem {
  idInsumo: number;
  nombre: string;
  cantidadUsada: number;
  precioUnidad: number;
  subtotal: number;
}

export interface ProductRequestDTO {
  nombre: string;
  tipo: ProductType;
  idUnidadMedida: number;
  cantidad: number;
  stockMinimo: number;
  precioCompra: number;
  precioVenta: number;
  porcentajeSobrante: number;
}

export interface ProductResponseDTO {
  message: string;
  code: number;
  data: number;
}

export interface ProductDTO {
  idProducto: number;
  nombre: string;
  tipo: ProductType;
  idUnidadMedida: number;
  cantidadDisponible: number;
  stockMinimo: number;
  precioCompra: number;
  precioVenta: number;
  porcentajeSobrante: number;
  unidadMedida: string;
  isLowStock?: boolean; // Mantener para UI
  composition?: CompositionItem[] | null;
}

