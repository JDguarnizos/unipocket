import { Component, inject } from '@angular/core';
// ReactiveFormsModule habilita [formGroup] y formControlName en el HTML
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SesionApi } from '../../../core/services/sesion-api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  // inject() trae los servicios de Angular (equivale a recibirlos en el constructor)
  private fb = inject(FormBuilder);
  private router = inject(Router);
  // RF13: los usuarios demostrativos vienen de la API local
  // (public/local-auth-api/usuarios.json y admins.json), SIN base de datos.
  // Cambiado: el login ahora usa SesionApi (antes LocalApi hacía todo)
  private sesion = inject(SesionApi);

  // Mensaje que se muestra si no se puede iniciar sesión (CU-2, curso alterno)
  mensajeError = '';

  // Formulario reactivo: cada campo con su valor inicial y sus validaciones
  loginForm = this.fb.group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(6)]]
  });

  // true si el campo es inválido Y el usuario ya lo tocó (así no salen errores apenas abre la página)
  campoInvalido(campo: string): boolean {
    const control = this.loginForm.get(campo);
    return !!control && control.invalid && control.touched;
  }

  // CU-1 / CU-2: se ejecuta al enviar el formulario
  iniciarSesion(): void {
    // Si hay errores, marcamos todos los campos como tocados para que se vean los mensajes
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { correo, contrasena } = this.loginForm.value;

    // Le pedimos al servicio que busque el correo y la contraseña.
    // Como leer un archivo tarda, el resultado llega dentro de subscribe().
    this.sesion.validarCredenciales(correo ?? '', contrasena ?? '').subscribe({
      next: usuario => {
        // Caso 1: no existe nadie con ese correo y contraseña
        if (!usuario) {
          this.mensajeError = 'Correo o contraseña incorrectos.';
          return;
        }

        // Caso 2 (nuevo, RF14): las credenciales son correctas, pero el administrador
        // bloqueó la cuenta. No guardamos la sesión y mostramos un mensaje distinto.
        if (usuario.bloqueado) {
          this.mensajeError = 'Tu cuenta está bloqueada. Contacta al administrador.';
          return;
        }

        // Caso 3: todo correcto
        this.mensajeError = '';
        // Guardamos quién entró (con su rol: "usuario" o "administrador")
        this.sesion.iniciarSesion(usuario);

        // Cada rol va a su vista: el administrador al panel de admin y el estudiante al dashboard.
        // Los Guards se encargan de que nadie entre a una vista que no le corresponde.
        const destino = usuario.rol === 'administrador' ? '/admin' : '/dashboard';
        this.router.navigate([destino]);
      },
      // Si no se pudo leer el JSON (ej. el archivo no existe)
      error: () => {
        this.mensajeError = 'No se pudo verificar el usuario. Intenta de nuevo.';
      }
    });
  }
}