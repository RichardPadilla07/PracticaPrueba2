import { Component, OnInit } from '@angular/core';
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
  IonInput,
  IonTextarea,
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
import { logOut, camera, home, save, arrowBack, checkmarkCircle, speedometer, documentText } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

interface LecturaCompleta {
  foto_medidor: string;
  foto_fachada: string;
  valor_medidor: number | null;
  observaciones: string;
  latitud: number;
  longitud: number;
}

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
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
    IonInput,
    IonTextarea,
    IonGrid,
    IonRow,
    IonCol,
    IonImg,
    IonText
  ],
})
export class Tab3Page implements OnInit {
  lectura: LecturaCompleta = {
    foto_medidor: '',
    foto_fachada: '',
    valor_medidor: null,
    observaciones: '',
    latitud: 0,
    longitud: 0
  };

  userEmail = '';
  userRole: string | null = null;
  datosParte1Cargados = false;

  constructor(
    private supabaseService: SupabaseService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private router: Router
  ) {
    addIcons({ logOut, camera, home, save, arrowBack, checkmarkCircle, speedometer, documentText });
  }

  async ngOnInit() {
    console.log('🔄 Tab3 - ngOnInit iniciado');
    await this.verificarRol();
    await this.cargarDatosUsuario();
    this.cargarDatosParte1();
  }

  // También agregar ionViewWillEnter para que se ejecute cada vez que entras al tab
  ionViewWillEnter() {
    console.log('🔄 Tab3 - ionViewWillEnter');
    this.cargarDatosParte1();
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

  cargarDatosParte1() {
    console.log('=== 🔍 Cargando datos del Paso 1 ===');
    const datos = localStorage.getItem('lecturaParte1');
    console.log('📦 Datos raw del localStorage:', datos);
    
    if (datos) {
      try {
        const parte1 = JSON.parse(datos);
        console.log('✅ Datos parseados:', parte1);
        
        if (parte1.foto_medidor && parte1.latitud !== undefined && parte1.longitud !== undefined) {
          this.lectura.foto_medidor = parte1.foto_medidor;
          this.lectura.latitud = parte1.latitud;
          this.lectura.longitud = parte1.longitud;
          this.datosParte1Cargados = true;
          
          console.log('✅ Datos cargados exitosamente en lectura:', {
            foto: this.lectura.foto_medidor.substring(0, 50) + '...',
            lat: this.lectura.latitud,
            lng: this.lectura.longitud,
            cargado: this.datosParte1Cargados
          });
        } else {
          console.error('❌ Datos incompletos:', parte1);
          this.showToast('Los datos del paso 1 están incompletos', 'warning');
          this.router.navigate(['/tabs/tab2']);
        }
      } catch (error) {
        console.error('❌ Error al parsear datos:', error);
        this.showToast('Error al cargar datos del paso 1', 'danger');
        this.router.navigate(['/tabs/tab2']);
      }
    } else {
      console.log('❌ No hay datos del paso 1 en localStorage');
      this.showToast('Debes completar el paso 1 primero', 'warning');
      this.router.navigate(['/tabs/tab2']);
    }
  }

  async seleccionarFotoFachada() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Seleccionar imagen',
      buttons: [
        {
          text: 'Tomar foto',
          icon: 'camera',
          handler: () => {
            this.tomarFoto();
          }
        },
        {
          text: 'Galería',
          icon: 'images',
          handler: () => {
            this.seleccionarDeGaleria();
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

  async tomarFoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      this.lectura.foto_fachada = image.dataUrl || '';
    } catch (error) {
      console.error('Error al tomar foto:', error);
      await this.showToast('Error al tomar la foto', 'danger');
    }
  }

  async seleccionarDeGaleria() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      this.lectura.foto_fachada = image.dataUrl || '';
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      await this.showToast('Error al seleccionar la imagen', 'danger');
    }
  }

  async guardarLectura() {
    if (!this.validarFormulario()) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar Registro',
      message: '¿Estás seguro de guardar esta lectura?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: async () => {
            await this.procesarGuardado();
          }
        }
      ]
    });
    await alert.present();
  }

  async procesarGuardado() {
    const loading = await this.loadingController.create({
      message: 'Guardando lectura...'
    });
    await loading.present();

    try {
      const userId = this.supabaseService.userId;
      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      // Subir foto del medidor
      const fotoMedidorBlob = await this.dataURLtoBlob(this.lectura.foto_medidor);
      const urlFotoMedidor = await this.supabaseService.uploadImage(fotoMedidorBlob, userId, 'medidor');

      // Subir foto de la fachada
      const fotoFachadaBlob = await this.dataURLtoBlob(this.lectura.foto_fachada);
      const urlFotoFachada = await this.supabaseService.uploadImage(fotoFachadaBlob, userId, 'fachada');

      // Crear registro de lectura con los nombres correctos de la BD
      await this.supabaseService.createLectura({
        meter_photo_url: urlFotoMedidor,
        facade_photo_url: urlFotoFachada,
        meter_value: this.lectura.valor_medidor!,
        observations: this.lectura.observaciones,
        latitude: this.lectura.latitud,
        longitude: this.lectura.longitud
      });

      await loading.dismiss();
      await this.showToast('Lectura guardada exitosamente', 'success');
      
      localStorage.removeItem('lecturaParte1');
      this.router.navigate(['/tabs/tab2']);
      this.limpiarFormulario();
      
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error al guardar:', error);
      await this.showToast(error.message || 'Error al guardar la lectura', 'danger');
    }
  }

  validarFormulario(): boolean {
    if (!this.lectura.foto_fachada) {
      this.showToast('Debes tomar la foto de la fachada', 'warning');
      return false;
    }

    if (!this.lectura.valor_medidor || this.lectura.valor_medidor <= 0) {
      this.showToast('Ingresa un valor válido del medidor', 'warning');
      return false;
    }

    return true;
  }

  limpiarFormulario() {
    this.lectura = {
      foto_medidor: '',
      foto_fachada: '',
      valor_medidor: null,
      observaciones: '',
      latitud: 0,
      longitud: 0
    };
    this.datosParte1Cargados = false;
  }

  async dataURLtoBlob(dataURL: string): Promise<Blob> {
    const response = await fetch(dataURL);
    return await response.blob();
  }

  volverAPaso1() {
    localStorage.removeItem('lecturaParte1');
    this.router.navigate(['/tabs/tab2']);
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
      message: '¿Estás seguro de que deseas cerrar sesión? Se perderán los datos no guardados.',
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