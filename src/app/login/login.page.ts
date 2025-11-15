import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonSegment,
  IonSegmentButton,
  IonText,
  IonSpinner,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { SupabaseService } from '../core/supabase';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonSegment,
    IonSegmentButton,
    IonText,
    IonSpinner
  ]
})
export class LoginPage implements OnInit {
  isLogin = true;
  email = '';
  password = '';
  selectedRole: 'administrador' | 'medidor' = 'medidor';
  isLoading = false;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    // Verificar si ya hay una sesión activa al cargar la página
    const user = await this.supabaseService.getCurrentUser();
    if (user) {
      this.router.navigate(['/tabs/tab1']);
    }
  }

  toggleMode() {
    this.isLogin = !this.isLogin;
    this.clearForm();
  }

  clearForm() {
    this.email = '';
    this.password = '';
    this.selectedRole = 'medidor';
  }

  async handleAuth() {
    if (!this.validateForm()) {
      return;
    }

    const loading = await this.loadingController.create({
      message: this.isLogin ? 'Iniciando sesión...' : 'Registrando...',
    });
    await loading.present();

    try {
      if (this.isLogin) {
        await this.supabaseService.signIn(this.email, this.password);
        await this.showToast('Inicio de sesión exitoso', 'success');
        this.router.navigate(['/tabs/tab1']);
      } else {
        await this.supabaseService.signUp(this.email, this.password, this.selectedRole);
        await this.showToast('Registro exitoso. Ya puedes iniciar sesión', 'success');
        this.isLogin = true;
        this.clearForm();
      }
    } catch (error: any) {
      console.error('Error de autenticación:', error);
      await this.showToast(
        error.message || 'Error en la autenticación',
        'danger'
      );
    } finally {
      await loading.dismiss();
    }
  }

  validateForm(): boolean {
    if (!this.email || !this.password) {
      this.showToast('Por favor completa todos los campos', 'warning');
      return false;
    }

    if (!this.isValidEmail(this.email)) {
      this.showToast('Por favor ingresa un email válido', 'warning');
      return false;
    }

    if (this.password.length < 6) {
      this.showToast('La contraseña debe tener al menos 6 caracteres', 'warning');
      return false;
    }

    return true;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color
    });
    await toast.present();
  }
}