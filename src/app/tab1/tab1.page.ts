import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
  IonImg,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { SupabaseService } from '../core/supabase';
import { addIcons } from 'ionicons';
import { logOut, locationOutline, calendarOutline, personOutline } from 'ionicons/icons';

interface Lectura {
  id: string;
  user_id: string;
  usuario_email: string;
  foto_medidor: string;
  foto_fachada: string;
  valor_medidor: number;
  observaciones: string;
  latitud: number;
  longitud: number;
  created_at: string;
  fecha_creacion: string;
  profiles?: {
    email: string;
    role: string;
  };
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonText,
    IonGrid,
    IonRow,
    IonCol,
    IonImg,
    IonBadge,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar
  ],
})
export class Tab1Page implements OnInit {
  lecturas: Lectura[] = [];
  lecturasFiltradas: Lectura[] = [];
  userRole: string | null = null;
  searchTerm = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    addIcons({ logOut, locationOutline, calendarOutline, personOutline });
  }

  async ngOnInit() {
    await this.verificarRolYCargarDatos();
  }

  async verificarRolYCargarDatos() {
    const loading = await this.loadingController.create({
      message: 'Cargando datos...'
    });
    await loading.present();

    try {
      this.userRole = await this.supabaseService.getCurrentUserRole();

      if (this.userRole !== 'administrador') {
        await loading.dismiss();
        await this.showToast('Acceso denegado. Solo administradores pueden acceder', 'danger');
        this.router.navigate(['/tabs/tab2']);
        return;
      }

      await this.cargarTodasLasLecturas();
    } catch (error) {
      console.error('Error:', error);
      await this.showToast('Error al cargar los datos', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async cargarTodasLasLecturas() {
    try {
      const data = await this.supabaseService.getTodasLasLecturas();
      
      console.log('📊 Lecturas cargadas:', data);
      
      this.lecturas = data.map((lectura: any) => ({
        id: lectura.id,
        user_id: lectura.user_id,
        usuario_email: lectura.users?.email || 'Usuario desconocido',
        valor_medidor: lectura.meter_value,
        observaciones: lectura.observations || 'Sin observaciones',
        foto_medidor: lectura.meter_photo_url,
        foto_fachada: lectura.facade_photo_url,
        latitud: lectura.latitude,
        longitud: lectura.longitude,
        created_at: lectura.created_at,
        fecha_creacion: lectura.created_at,
        profiles: lectura.users
      }));
      
      this.lecturasFiltradas = [...this.lecturas];
      console.log('✅ Lecturas procesadas:', this.lecturasFiltradas);
      
    } catch (error) {
      console.error('Error al cargar lecturas:', error);
      await this.showToast('Error al cargar las lecturas', 'danger');
    }
  }

  buscarLecturas(event: any) {
    const searchTerm = event.target.value?.toLowerCase() || '';
    
    if (!searchTerm) {
      this.lecturasFiltradas = [...this.lecturas];
      return;
    }

    this.lecturasFiltradas = this.lecturas.filter(lectura => {
      const email = lectura.profiles?.email?.toLowerCase() || '';
      const observaciones = lectura.observaciones?.toLowerCase() || '';
      const valor = lectura.valor_medidor?.toString() || '';
      
      return email.includes(searchTerm) || 
             observaciones.includes(searchTerm) || 
             valor.includes(searchTerm);
    });
  }

  async refrescarLecturas(event: any) {
    await this.cargarTodasLasLecturas();
    event.target.complete();
  }

  abrirEnMaps(lat: number, lng: number) {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-ES');
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

  async logout() {
    await this.supabaseService.signOut();
    localStorage.clear();
    sessionStorage.clear();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}