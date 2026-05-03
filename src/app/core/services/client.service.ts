import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private readonly apiUrl = `${environment.apiUrl}/clientes`;
  private readonly http = inject(HttpClient);

  /**
   * GET /api/v1/clientes?page=0&size=200&filtro=<term>
   * Backend devuelve: ApiResponse<PageResponse<ClienteListadoDto>>
   * ClienteListadoDto: { idCliente, nombre, direccion, telefonos[] }
   */
  getAll(searchTerm?: string): Observable<any[]> {
    let params = new HttpParams()
      .set('page', '0')
      .set('size', '200'); // Cargamos todo para paginación local

    if (searchTerm && searchTerm.trim() !== '') {
      params = params.set('filtro', searchTerm.trim());
    }

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(res => {
        // ApiResponse structure: { data: PageResponse<ClienteListadoDto> }
        // PageResponse structure: { data: [], content: [] }
        const page = res.data;
        const list: any[] = page?.data || page?.content || [];
        return list.map((item: any) => ({
          idCliente: item.idCliente,
          nombre: item.nombre,
          direccion: item.direccion || '',
          telefonos: item.telefonos || [],
          // Aliases para compatibilidad con la UI
          id: String(item.idCliente),
          name: item.nombre,
          phones: item.telefonos || [],
          address: item.direccion || '',
          isActive: true,
          ordersSummary: { total: 0, pending: 0, inProduction: 0 }
        }));
      })
    );
  }

  /**
   * POST /api/v1/clientes
   * Body: ClienteRequestDto { nombre, telefonos[], direccion }
   */
  create(data: any): Observable<any> {
    const payload = {
      nombre: data.name || data.nombre,
      telefonos: data.phones || data.telefonos || [],
      direccion: data.address || data.direccion || ''
    };
    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(res => res.data)
    );
  }

  /**
   * PUT /api/v1/clientes/{id}
   * Body: ClienteRequestDto { nombre, telefonos[], direccion }
   */
  update(id: string | number, data: any): Observable<any> {
    const payload = {
      nombre: data.name || data.nombre,
      telefonos: data.phones || data.telefonos || [],
      direccion: data.address || data.direccion || ''
    };
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      map(res => res.data)
    );
  }

  /**
   * DELETE /api/v1/clientes/{id}
   * Backend hace borrado lógico (activo=false) o físico según tenga pedidos
   */
  delete(id: string | number): Observable<void> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.data)
    );
  }
}
