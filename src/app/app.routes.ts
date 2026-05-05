import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { LayoutComponent } from './layout/layout';
import { HomeComponent } from './home/home';
import { ClientesComponent } from './clientes/clientes';
import { InventarioComponent } from './inventario/inventario';
import { PedidosComponent } from './pedidos/pedidos';
import { PagosComponent } from './pagos/pagos';
import { ReportesComponent } from './reportes/reportes';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { CambiarContrasenaComponent } from './cambiar-contrasena/cambiar-contrasena';
import { RestablecerCorreoComponent } from './restablecer-correo/restablecer-correo';
import { PerfilComponent } from './perfil/perfil';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'clientes', component: ClientesComponent },
      { path: 'inventario', component: InventarioComponent },
      { path: 'pedidos', component: PedidosComponent },
      { path: 'pagos', component: PagosComponent },
      { path: 'reportes', component: ReportesComponent },
      { path: 'perfil', component: PerfilComponent },
      { path: 'cambiar-contrasena', component: CambiarContrasenaComponent },
      { path: 'restablecer-correo', component: RestablecerCorreoComponent }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
