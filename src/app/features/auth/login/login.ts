import { Component, inject } from '@angular/core';
// ReactiveFormsModule habilita [formGroup] y formControlName en el HTML
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LocalApi } from '../../../core/services/local-api';

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
  // RF13: los usuarios demostrativos vienen de la API local de Juan
  // (public/local-auth-api/usuarios.json y admins.json), SIN base de datos.
  private api = inject(LocalApi);

  // Mensaje que se muestra si las credenciales no coinciden (CU-2, curso alterno)
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

    // Le pedimos al servicio que busque el correo y la contraseña en los JSON.
    // Como leer un archivo tarda, el resultado llega dentro de subscribe().
    this.api.validarCredenciales(correo ?? '', contrasena ?? '').subscribe({
      next: usuario => {
        if (usuario) {
          this.mensajeError = '';
          // Guardamos quién entró (con su rol: "usuario" o "administrador")
          this.api.iniciarSesion(usuario);
          // Por ahora ambos roles van al dashboard. Juan separará usuario/admin con los Guards.
          this.router.navigate(['/dashboard']);
        } else {
          this.mensajeError = 'Correo o contraseña incorrectos.';
        }
      },
      // Si no se pudo leer el JSON (ej. el archivo no existe)
      error: () => {
        this.mensajeError = 'No se pudo verificar el usuario. Intenta de nuevo.';
      }
    });
  }
}