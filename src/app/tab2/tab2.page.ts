// filepath: c:\movilas25b\repasoex1medidores\src\app\tab2\tab2.page.ts
import { Component, OnInit } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonImg,
  IonText,
  LoadingController,
  ToastController,
  AlertController,
  ActionSheetController
} from '@ionic/angular/standalone';
import { SupabaseService } from '../core/supabase';
import { addIcons } from 'ionicons';
import { logOut, camera, locate, checkmarkCircle } from 'ionicons/icons';

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
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonImg,
    IonText
  ],
})
export class Tab2Page implements OnInit {
  lectura: LecturaParte1 = {
    foto_medidor: null,
    latitud: null,
    longitud: null
  };

  locationObtained = false;
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
    try {
      // Primero solicitar permisos
      const permissions = await Geolocation.requestPermissions();
      console.log('Permisos de ubicación:', permissions);

      if (permissions.location === 'denied') {
        await this.showToast('Necesitas activar los permisos de ubicación', 'warning');
        return;
      }

      const loading = await this.loadingController.create({
        message: 'Obteniendo ubicación...'
      });
      await loading.present();

      // Obtener ubicación con opciones mejoradas
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });

      this.lectura.latitud = coordinates.coords.latitude;
      this.lectura.longitud = coordinates.coords.longitude;
      this.locationObtained = true;
      await this.showToast('Ubicación obtenida correctamente', 'success');
      
      console.log('📍 Ubicación obtenida:', {
        lat: this.lectura.latitud,
        lng: this.lectura.longitud
      });
    } catch (error: any) {
      console.error('❌ Error al obtener ubicación:', error);
      
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

  abrirEnMaps() {
    if (this.lectura.latitud && this.lectura.longitud) {
      const url = `https://www.google.com/maps?q=${this.lectura.latitud},${this.lectura.longitud}`;
      window.open(url, '_blank');
    }
  }

  async continuarATab3() {
    // Validar que se haya tomado la foto
    if (!this.lectura.foto_medidor) {
      await this.showToast('Debes tomar la foto del medidor', 'warning');
      return;
    }

    // Validar que se haya obtenido la ubicación
    if (!this.lectura.latitud || !this.lectura.longitud || this.lectura.latitud === 0 || this.lectura.longitud === 0) {
      await this.showToast('Debes obtener la ubicación GPS', 'warning');
      return;
    }

    // Guardar datos en localStorage
    const datosTab2 = {
      foto_medidor: this.lectura.foto_medidor,
      latitud: this.lectura.latitud,
      longitud: this.lectura.longitud
    };
    
    console.log('Guardando datos del paso 1:', datosTab2);
    localStorage.setItem('lecturaParte1', JSON.stringify(datosTab2));
    
    // Verificar que se guardó correctamente
    const verificar = localStorage.getItem('lecturaParte1');
    console.log('Datos guardados verificados:', verificar);
    
    await this.showToast('Continúa completando la lectura en Tab 3', 'success');
    
    // Navegar a tab3
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