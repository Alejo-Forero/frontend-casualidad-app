import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/usuarios`;
  private readonly http = inject(HttpClient);

  getAll(): Observable<any[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(res => res.data?.data || res.data || [])
    );
  }

  getById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.data)
    );
  }

  create(data: any): Observable<any> {
    const payload = {
      nombre: data.nombre || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      correo: data.email || data.correo || '',
      contraseña: data.password || '123456', // provide a default password if missing
      idRol: data.idRol || 2 // default to 2 (e.g. USER)
    };
    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(res => res.data)
    );
  }

  update(id: string, data: any): Observable<any> {
    const payload = {
      nombre: data.nombre || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      correo: data.email || data.correo || ''
    };
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      map(res => res.data)
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.data)
    );
  }
}
