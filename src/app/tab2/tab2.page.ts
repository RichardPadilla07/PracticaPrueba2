// filepath: c:\movilas25b\repasoex1medidores\src\app\tab2\tab2.page.ts
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
  IonTextarea,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
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
import { addIcons } from 'ionicons';
import { 
  camera, 
  home, 
  locate, 
  save, 
  logOut,
  checkmarkCircle,
  closeCircle,
  locationOutline,
  images,
  cameraOutline
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { SupabaseService } from '../core/supabase';

interface Lectura {
  foto_medidor: string | null;
  foto_fachada: string | null;
  valor_medidor: number | null;
  observaciones: string;
  latitud: number | null;
  longitud: number | null;
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
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
    IonTextarea,
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    IonGrid,
    IonRow,
    IonCol,
    IonImg,
    IonText
  ],
})
export class Tab2Page implements OnInit {
  lectura: Lectura = {
    foto_medidor: null,
    foto_fachada: null,
    valor_medidor: null,
    observaciones: '',
    latitud: null,
    longitud: null
  };

  locationObtained = false;
  userEmail = '';

  constructor(
    private supabaseService: SupabaseService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private router: Router
  ) {
    addIcons({ 
      camera, 
      home, 
      locate, 
      save, 
      logOut,
      checkmarkCircle,
      closeCircle,
      locationOutline,
      images,
      cameraOutline
    });
  }

  async ngOnInit() {
    // Verificar si el usuario está autenticado
    this.supabaseService.user$.subscribe(async (user) => {
      if (!user) {
        this.router.navigate(['/tabs/tab1']);
      } else {
        this.userEmail = user.email || '';
      }
    });
  }

  async seleccionarFotoMedidor() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Seleccionar Foto del Medidor',
      buttons: [
        {
          text: 'Tomar Foto',
          icon: 'camera-outline',
          handler: () => {
            this.tomarFoto('medidor', CameraSource.Camera);
          }
        },
        {
          text: 'Seleccionar de Galería',
          icon: 'images',
          handler: () => {
            this.tomarFoto('medidor', CameraSource.Photos);
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

  async seleccionarFotoFachada() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Seleccionar Foto de la Fachada',
      buttons: [
        {
          text: 'Tomar Foto',
          icon: 'camera-outline',
          handler: () => {
            this.tomarFoto('fachada', CameraSource.Camera);
          }
        },
        {
          text: 'Seleccionar de Galería',
          icon: 'images',
          handler: () => {
            this.tomarFoto('fachada', CameraSource.Photos);
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

  async tomarFoto(tipo: 'medidor' | 'fachada', source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source,
        saveToGallery: source === CameraSource.Camera,
        promptLabelHeader: tipo === 'medidor' ? 'Foto del Medidor' : 'Foto de la Fachada',
        promptLabelPhoto: 'Seleccionar de Galería',
        promptLabelPicture: 'Tomar Foto'
      });

      if (tipo === 'medidor') {
        this.lectura.foto_medidor = image.dataUrl || null;
        await this.showToast('Foto del medidor capturada', 'success');
      } else {
        this.lectura.foto_fachada = image.dataUrl || null;
        await this.showToast('Foto de la fachada capturada', 'success');
      }
    } catch (error: any) {
      console.error(`Error al capturar foto de ${tipo}:`, error);
      
      // No mostrar error si el usuario cancela
      if (!error.message?.includes('cancelled') && !error.message?.includes('cancel')) {
        await this.showToast(`Error al capturar la foto de ${tipo}`, 'danger');
      }
    }
  }

  async obtenerUbicacion() {
    const loading = await this.loadingController.create({
      message: 'Obteniendo ubicación GPS...',
    });
    await loading.present();

    try {
      // Primero verificar y solicitar permisos
      const permissions = await Geolocation.checkPermissions();
      
      if (permissions.location !== 'granted') {
        const request = await Geolocation.requestPermissions();
        
        if (request.location !== 'granted') {
          await loading.dismiss();
          await this.showToast('Se requieren permisos de ubicación para continuar', 'warning');
          return;
        }
      }

      // Obtener ubicación con configuración optimizada
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });

      this.lectura.latitud = position.coords.latitude;
      this.lectura.longitud = position.coords.longitude;
      this.locationObtained = true;

      await this.showToast('Ubicación obtenida correctamente', 'success');
    } catch (error: any) {
      console.error('Error al obtener ubicación:', error);
      
      let mensaje = 'Error al obtener la ubicación GPS';
      
      if (error.message?.includes('timeout')) {
        mensaje = 'Tiempo de espera agotado. Asegúrate de tener GPS activado';
      } else if (error.message?.includes('permission')) {
        mensaje = 'Permisos de ubicación denegados';
      } else if (error.message?.includes('unavailable')) {
        mensaje = 'GPS no disponible. Activa la ubicación en tu dispositivo';
      }
      
      await this.showToast(mensaje, 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  abrirEnMaps() {
    if (this.lectura.latitud && this.lectura.longitud) {
      const url = `https://www.google.com/maps?q=${this.lectura.latitud},${this.lectura.longitud}`;
      window.open(url, '_system');
    }
  }

  async guardarLectura() {
    // Validar formulario
    if (!this.validarFormulario()) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Guardando lectura...',
    });
    await loading.present();

    try {
      const userId = this.supabaseService.userId;
      if (!userId) throw new Error('Usuario no autenticado');

      // Subir foto del medidor
      let urlFotoMedidor = '';
      if (this.lectura.foto_medidor) {
        const blobMedidor = await this.dataUrlToBlob(this.lectura.foto_medidor);
        urlFotoMedidor = await this.supabaseService.uploadImage(blobMedidor, userId, 'medidor');
      }

      // Subir foto de la fachada
      let urlFotoFachada = '';
      if (this.lectura.foto_fachada) {
        const blobFachada = await this.dataUrlToBlob(this.lectura.foto_fachada);
        urlFotoFachada = await this.supabaseService.uploadImage(blobFachada, userId, 'fachada');
      }

      // Guardar lectura en la base de datos
      await this.supabaseService.createLectura({
        foto_medidor: urlFotoMedidor,
        foto_fachada: urlFotoFachada,
        valor_medidor: this.lectura.valor_medidor!,
        observaciones: this.lectura.observaciones,
        latitud: this.lectura.latitud!,
        longitud: this.lectura.longitud!
      });

      await this.showToast('Lectura guardada exitosamente', 'success');
      this.limpiarFormulario();
      
      // Navegar al tab de historial
      this.router.navigate(['/tabs/tab3']);
    } catch (error: any) {
      console.error('Error al guardar lectura:', error);
      await this.showToast(error.message || 'Error al guardar la lectura', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  validarFormulario(): boolean {
    if (!this.lectura.foto_medidor) {
      this.showToast('Debes capturar la foto del medidor', 'warning');
      return false;
    }

    if (!this.lectura.foto_fachada) {
      this.showToast('Debes capturar la foto de la fachada', 'warning');
      return false;
    }

    if (!this.lectura.valor_medidor || this.lectura.valor_medidor <= 0) {
      this.showToast('Debes ingresar un valor válido del medidor', 'warning');
      return false;
    }

    if (!this.lectura.latitud || !this.lectura.longitud) {
      this.showToast('Debes obtener la ubicación GPS', 'warning');
      return false;
    }

    return true;
  }

  limpiarFormulario() {
    this.lectura = {
      foto_medidor: null,
      foto_fachada: null,
      valor_medidor: null,
      observaciones: '',
      latitud: null,
      longitud: null
    };
    this.locationObtained = false;
  }

  async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return await response.blob();
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
          text: 'Cerrar Sesión',
          handler: async () => {
            await this.cerrarSesion();
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