import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CambiarPasswordRequest {
  codigo: string;
  nuevaPassword: string;
}

export interface ValidarCorreoActualRequest {
  codigoActual: string;
  nuevoCorreo: string;
}

export interface ConfirmarNuevoCorreoRequest {
  codigoNuevo: string;
}

export interface ActualizarPerfilRequest {
  nombre: string;
  apellidos: string;
  telefono: string;
}

@Injectable({
  providedIn: 'root'
})
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly passwordUrl = `${environment.apiUrl}/perfil/seguridad/password`;
  private readonly correoUrl = `${environment.apiUrl}/perfil/seguridad/correo`;
  private readonly perfilUrl = `${environment.apiUrl}/usuarios/perfil`;

  // ─── Password ──────────────────────────────────────────────────────────────

  solicitarCodigoPassword(): Observable<any> {
    return this.http.post<any>(`${this.passwordUrl}/solicitar-codigo`, {});
  }

  cambiarPassword(payload: CambiarPasswordRequest): Observable<any> {
    return this.http.put<any>(`${this.passwordUrl}/cambiar`, payload);
  }

  // ─── Correo ────────────────────────────────────────────────────────────────

  solicitarCodigoCorreoActual(): Observable<any> {
    return this.http.post<any>(`${this.correoUrl}/solicitar-codigo-actual`, {});
  }

  validarActualYSolicitarNuevo(payload: ValidarCorreoActualRequest): Observable<any> {
    return this.http.post<any>(`${this.correoUrl}/validar-actual-y-solicitar-nuevo`, payload);
  }

  confirmarCambioCorreo(payload: ConfirmarNuevoCorreoRequest): Observable<any> {
    return this.http.put<any>(`${this.correoUrl}/confirmar-cambio`, payload);
  }

  // ─── Perfil ────────────────────────────────────────────────────────────────

  actualizarPerfil(payload: ActualizarPerfilRequest): Observable<any> {
    return this.http.put<any>(this.perfilUrl, payload);
  }
}
