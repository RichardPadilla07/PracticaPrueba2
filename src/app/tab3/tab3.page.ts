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
  IonButton,
  IonIcon,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonRefresher,
  IonRefresherContent,
  IonGrid,
  IonRow,
  IonCol,
  IonImg,
  IonText,
  IonBadge,
  IonChip,
  LoadingController,
  ToastController,
  ModalController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendar,
  location,
  person,
  refresh,
  logOut,
  filter,
  search,
  eye,
  map,
  water,
  home,
  camera,
  informationCircle
} from 'ionicons/icons';
import { SupabaseService } from '../core/supabase';

interface Lectura {
  id: string;
  user_id: string;
  foto_medidor: string;
  foto_fachada: string;
  valor_medidor: number;
  observaciones: string;
  latitud: number;
  longitud: number;
  created_at: string;
  profiles?: {
    email: string;
    role: string;
  };
}

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
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
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonRefresher,
    IonRefresherContent,
    IonGrid,
    IonRow,
    IonCol,
    IonImg,
    IonText,
    IonBadge,
    IonChip
  ],
})
export class Tab3Page implements OnInit {
  lecturas: Lectura[] = [];
  lecturasFiltradas: Lectura[] = [];
  userRole: string | null = null;
  userEmail = '';
  
  // Filtros
  searchTerm = '';
  ordenamiento: 'recientes' | 'antiguos' | 'valor_asc' | 'valor_desc' = 'recientes';

  isLoading = false;

  constructor(
    private supabaseService: SupabaseService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController,
    private alertController: AlertController,
    private router: Router
  ) {
    addIcons({
      calendar,
      location,
      person,
      refresh,
      logOut,
      filter,
      search,
      eye,
      map,
      water,
      home,
      camera,
      informationCircle
    });
  }

  async ngOnInit() {
    // Verificar autenticación y obtener rol
    this.supabaseService.user$.subscribe(async (user) => {
      if (!user) {
        this.router.navigate(['/tabs/tab1']);
      } else {
        this.userEmail = user.email || '';
        await this.cargarRolYLecturas();
      }
    });
  }

  async cargarRolYLecturas() {
    const loading = await this.loadingController.create({
      message: 'Cargando lecturas...',
    });
    await loading.present();

    try {
      // Obtener rol del usuario
      this.userRole = await this.supabaseService.getCurrentUserRole();
      
      // Cargar lecturas según el rol
      await this.cargarLecturas();
    } catch (error) {
      console.error('Error al cargar datos:', error);
      await this.showToast('Error al cargar las lecturas', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async cargarLecturas() {
    try {
      if (this.userRole === 'administrador') {
        // Administradores ven todas las lecturas
        this.lecturas = await this.supabaseService.getTodasLasLecturas();
      } else {
        // Medidores solo ven sus propias lecturas
        this.lecturas = await this.supabaseService.getMisLecturas();
      }
      
      this.aplicarFiltros();
    } catch (error) {
      console.error('Error al cargar lecturas:', error);
      throw error;
    }
  }

  async refrescarLecturas(event?: any) {
    try {
      await this.cargarLecturas();
      await this.showToast('Lecturas actualizadas', 'success');
    } catch (error) {
      console.error('Error al refrescar:', error);
      await this.showToast('Error al actualizar', 'danger');
    } finally {
      if (event) {
        event.target.complete();
      }
    }
  }

  aplicarFiltros() {
    let resultado = [...this.lecturas];

    // Aplicar búsqueda por texto
    if (this.searchTerm.trim()) {
      const termino = this.searchTerm.toLowerCase();
      resultado = resultado.filter(lectura => 
        lectura.valor_medidor.toString().includes(termino) ||
        lectura.observaciones.toLowerCase().includes(termino) ||
        (lectura.profiles?.email || '').toLowerCase().includes(termino) ||
        this.formatearFecha(lectura.created_at).toLowerCase().includes(termino)
      );
    }

    // Aplicar ordenamiento
    switch (this.ordenamiento) {
      case 'recientes':
        resultado.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case 'antiguos':
        resultado.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case 'valor_asc':
        resultado.sort((a, b) => a.valor_medidor - b.valor_medidor);
        break;
      case 'valor_desc':
        resultado.sort((a, b) => b.valor_medidor - a.valor_medidor);
        break;
    }

    this.lecturasFiltradas = resultado;
  }

  buscar(event: any) {
    this.searchTerm = event.target.value || '';
    this.aplicarFiltros();
  }

  cambiarOrdenamiento(event: any) {
    this.ordenamiento = event.detail.value;
    this.aplicarFiltros();
  }

  abrirEnMaps(latitud: number, longitud: number) {
    const url = `https://www.google.com/maps?q=${latitud},${longitud}`;
    window.open(url, '_system');
  }

  async verDetalles(lectura: Lectura) {
    const alert = await this.alertController.create({
      header: 'Detalles de la Lectura',
      message: `
        <div style="text-align: left;">
          <p><strong>Valor:</strong> ${lectura.valor_medidor}</p>
          <p><strong>Fecha:</strong> ${this.formatearFecha(lectura.created_at)}</p>
          <p><strong>Hora:</strong> ${this.formatearHora(lectura.created_at)}</p>
          ${this.userRole === 'administrador' ? `<p><strong>Registrado por:</strong> ${lectura.profiles?.email || 'N/A'}</p>` : ''}
          <p><strong>Coordenadas:</strong><br>
          Lat: ${lectura.latitud.toFixed(6)}<br>
          Lon: ${lectura.longitud.toFixed(6)}</p>
          ${lectura.observaciones ? `<p><strong>Observaciones:</strong><br>${lectura.observaciones}</p>` : ''}
        </div>
      `,
      buttons: [
        {
          text: 'Ver en Maps',
          handler: () => {
            this.abrirEnMaps(lectura.latitud, lectura.longitud);
          }
        },
        {
          text: 'Cerrar',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  async verImagen(url: string, tipo: string) {
    const alert = await this.alertController.create({
      header: `Foto ${tipo}`,
      message: `<img src="${url}" style="width: 100%; border-radius: 8px;">`,
      cssClass: 'image-alert',
      buttons: ['Cerrar']
    });

    await alert.present();
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatearHora(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  obtenerUrlMaps(latitud: number, longitud: number): string {
    return `https://www.google.com/maps?q=${latitud},${longitud}`;
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