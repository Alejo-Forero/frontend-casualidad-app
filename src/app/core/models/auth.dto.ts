export interface UserDTO {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

export interface LoginRequestDTO {
  correo: string;
  contraseña: string;
}

export interface LoginResponseDTO {
  accessToken: string;
  refreshToken: string;
  usuario: UserDTO;
}

export interface RegisterRequestDTO {
  nombre: string;
  correo: string;
  contraseña: string;
  rol: string;
}

export interface RegisterResponseDTO {
  accessToken: string;
  refreshToken: string;
  nombreUsuario: string;
}
