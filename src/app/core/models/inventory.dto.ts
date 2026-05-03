export interface UnitDTO {
  id: string;
  name: string;
}

export type ProductType = 'INSUMO' | 'ELABORADO' | 'TRANSFORMADO' | 'REVENTA';

export interface CompositionItem {
  inventoryId: string;
  name: string;
  quantity: number;
  unitCost: number;
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
  // New API fields
  idProducto?: number;
  nombre?: string;
  tipo?: ProductType;
  idUnidadMedida?: number;
  cantidad?: number;
  stockMinimo?: number;
  precioCompra?: number;
  precioVenta?: number;
  porcentajeSobrante?: number;

  // Legacy fields for UI compatibility
  id: string;
  name: string;
  type: ProductType;
  unit: UnitDTO;
  stock: number;
  minStock: number;
  purchasePrice: number | null;
  salePrice: number | null;
  wastePercent: number | null;
  productionCost: number | null;
  isLowStock: boolean;
  composition: CompositionItem[] | null;
}
