// filepath: c:\movilas25b\repasoex1medidores\src\app\tab2\tab2.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
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
  IonButton,
  IonIcon,
  IonImg,
  IonText,
  LoadingController,
  ToastController,
  AlertController,
  ActionSheetController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOut, camera, locate, checkmarkCircle } from 'ionicons/icons';
import { SupabaseService } from '../core/supabase';

interface LecturaParte1 {
  foto_medidor: string | null;
  latitud: number | null;
  longitud: number | null;
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
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
    IonButton,
    IonIcon,
    IonImg,
    IonText,
  ],
})
export class Tab2Page implements OnInit {
  lectura: LecturaParte1 = {
    foto_medidor: null,
    latitud: null,
    longitud: null
  };

  ubicacionObtenida = false;
  userEmail = '';
  userRole: string | null = null;

  constructor(
    private supabaseService: SupabaseService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private router: Router
  ) {
    addIcons({ logOut, camera, locate, checkmarkCircle });
  }

  async ngOnInit() {
    await this.verificarRol();
    await this.cargarDatosUsuario();
  }

  async verificarRol() {
    this.userRole = await this.supabaseService.getCurrentUserRole();

    if (this.userRole === 'administrador') {
      await this.showToast('Los administradores no pueden registrar lecturas', 'warning');
      this.router.navigate(['/tabs/tab1']);
    }
  }

  async cargarDatosUsuario() {
    const user = await this.supabaseService.getCurrentUser();
    this.userEmail = user?.email || '';
  }

  async seleccionarFotoMedidor() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Seleccionar imagen',
      buttons: [
        {
          text: 'Tomar foto',
          icon: 'camera',
          handler: () => {
            this.tomarFoto('medidor');
          }
        },
        {
          text: 'Galería',
          icon: 'images',
          handler: () => {
            this.seleccionarDeGaleria('medidor');
          }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async tomarFoto(tipo: 'medidor') {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      this.lectura.foto_medidor = image.dataUrl || null;
    } catch (error) {
      console.error('Error al tomar foto:', error);
      await this.showToast('Error al tomar la foto', 'danger');
    }
  }

  async seleccionarDeGaleria(tipo: 'medidor') {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      this.lectura.foto_medidor = image.dataUrl || null;
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      await this.showToast('Error al seleccionar la imagen', 'danger');
    }
  }

  async obtenerUbicacion() {
    const loading = await this.loadingController.create({
      message: 'Obteniendo ubicación...'
    });

    try {
      await loading.present();

      // Primero solicitar permisos
      const permissions = await Geolocation.requestPermissions();
      console.log('Permisos de ubicación:', permissions);

      if (permissions.location === 'denied') {
        await loading.dismiss();
        await this.showToast('Necesitas activar los permisos de ubicación', 'warning');
        return;
      }

      // Obtener ubicación
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });

      this.lectura.latitud = coordinates.coords.latitude;
      this.lectura.longitud = coordinates.coords.longitude;
      this.ubicacionObtenida = true;

      await loading.dismiss();
      await this.showToast('Ubicación obtenida correctamente', 'success');

      console.log('📍 Ubicación obtenida:', {
        lat: this.lectura.latitud,
        lng: this.lectura.longitud
      });

    } catch (error: any) {
      await loading.dismiss();
      console.error('Error al obtener ubicación:', error);

      let mensaje = 'Error al obtener la ubicación';

      if (error.message?.includes('location services are not enabled')) {
        mensaje = 'Activa el GPS en tu dispositivo';
      } else if (error.message?.includes('User denied')) {
        mensaje = 'Debes permitir el acceso a la ubicación';
      } else if (error.message?.includes('timeout')) {
        mensaje = 'No se pudo obtener la ubicación. Intenta de nuevo';
      }

      await this.showToast(mensaje, 'danger');
    }
  }

  verEnMapa() {
    if (this.lectura.latitud && this.lectura.longitud) {
      const url = `https://www.google.com/maps?q=${this.lectura.latitud},${this.lectura.longitud}`;
      window.open(url, '_blank');
    }
  }

  async continuarATab3() {
    if (!this.lectura.foto_medidor) {
      await this.showToast('Debes tomar la foto del medidor', 'warning');
      return;
    }
    if (!this.lectura.latitud || !this.lectura.longitud || this.lectura.latitud === 0 || this.lectura.longitud === 0) {
      await this.showToast('Debes obtener la ubicación GPS', 'warning');
      return;
    }
    const datosTab2 = {
      foto_medidor: this.lectura.foto_medidor,
      latitud: this.lectura.latitud,
      longitud: this.lectura.longitud
    };

    console.log('Guardando datos capturados:', datosTab2);
    localStorage.setItem('lecturaParte1', JSON.stringify(datosTab2));

    const verificar = localStorage.getItem('lecturaParte1');
    console.log('Datos guardados verificados:', verificar);

    await this.showToast('Continúa agregando datos adicionales', 'success');
    this.router.navigate(['/tabs/tab3']);
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

  async confirmarCerrarSesion() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Salir',
          handler: () => {
            this.cerrarSesion();
          }
        }
      ]
    });
    await alert.present();
  }

  async cerrarSesion() {
    try {
      await this.supabaseService.signOut();
      localStorage.clear();
      sessionStorage.clear();
      this.router.navigate(['/login'], { replaceUrl: true });
      await this.showToast('Sesión cerrada', 'success');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      await this.showToast('Error al cerrar sesión', 'danger');
    }
  }
}