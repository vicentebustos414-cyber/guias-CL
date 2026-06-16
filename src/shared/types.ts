export interface CargoExtra {
  descripcion: string;
  monto: number;
}

export interface Guia {
  id?: number;
  numero_guia: string;
  fecha: string;
  origen: string;
  destino: string;
  empresa_flete: string;
  rut_empresa: string;
  nombre_chofer: string;
  rut_chofer: string;
  patente: string;
  descripcion_carga: string;
  monto_base: number;
  cargos_extra: CargoExtra[];
  monto_total: number;
  estado: 'pendiente' | 'pagado' | 'anulado';
  notas?: string;
  created_at?: string;
}

export interface Empresa {
  id?: number;
  nombre: string;
  rut: string;
  direccion: string;
  telefono: string;
  email: string;
  giro: string;
}

export interface Viaje {
  id?: number;
  fecha: string;
  origen: string;
  destino: string;
  empresa: string;
  nombre_chofer: string;
  patente: string;
  kilometros: number;
  duracion_horas: number;
  monto_cobrado: number;
  estado: 'realizado' | 'pendiente' | 'cancelado';
  numero_guia?: string;
  notas?: string;
  created_at?: string;
}

export interface AppConfig {
  empresa_emisora: Empresa;
  prefijo_guia: string;
  ultimo_numero: number;
  firma_imagen?: string; // base64 PNG de la firma visual del emisor
}
